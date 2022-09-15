import React, { useState, useEffect } from "react";
import MyForm from "./MyForm";
import Web3 from "web3";
import BigNumber from "bignumber.js";
import { newKitFromWeb3 } from "@celo/contractkit";
import zbondAbi from "./contract/zbond.abi.json";
import "./App.css";

const ERC20_DECIMALS = 18;
const zbondAddress = "0xD0A044b137DBF7E14464164323139a52e1E0bc31";

const truncateAddress = (address) => {
  if (!address) return;
  return (
    address.slice(0, 5) +
    "..." +
    address.slice(address.length - 4, address.length)
  );
};

// Helper function
const displayConfirmations = (cfms) => {
  if (Number(cfms[0]) + Number(cfms[1]) == 0) {
    return "0 Confirmations";
  } else if (Number(cfms[0]) > 1 && Number(cfms[1]) == 0) {
    return "1 [Bond creator],";
  } else if (Number(cfms[0]) == 0 && Number(cfms[1] > 1)) {
    return "1 [Party involved]";
  } else if (Number(cfms[0]) > 0 && Number(cfms[1]) > 1) {
    return "2 [Both parties]";
  }
};

const BondCard = ({
  bd,
  catg,
  signBond,
  validateBond,
  confirmBond,
  closeBond,
}) => {
  return (
    <div className="bond-card">
      <div className="bond-title">Transaction Receipt</div>
      <div className="bond-info">
        <div className="info">
          <table>
            <tr>
              <td>ID: </td>
              <td>{bd.id}</td>
            </tr>
            <tr>
              <td>Description:</td>
              <td>{bd.description}</td>
            </tr>
            <tr>
              <td>Amount: </td>
              <td>
                {new BigNumber(bd.amount).shiftedBy(-ERC20_DECIMALS).toString()}{" "}
                CELO
              </td>
            </tr>
            <tr>
              <td>Created By: </td>
              <td>{truncateAddress(bd.creator)}</td>
            </tr>
            <tr>
              <td>Party Involved: </td>
              <td>{truncateAddress(bd.partyInvolved)}</td>
            </tr>
            <tr>
              <td>Confirmations: </td>
              <td>{displayConfirmations(bd.confirmations)}</td>
            </tr>
            <tr>
              <td>Signed: </td>
              <td>{bd.signed.toString()}</td>
            </tr>
            <tr>
              <td>Validated: </td>
              <td>{bd.validated.toString()}</td>
            </tr>
            <tr>
              <td>Completed: </td>
              <td>{bd.completed.toString()}</td>
            </tr>
          </table>
        </div>
        <div className="bond-actions">
          <button hidden={catg != "sign"} onClick={() => signBond(bd.id)}>
            Sign
          </button>
          <button
            hidden={catg != "validate"}
            onClick={() => validateBond(bd.id)}
          >
            Validate
          </button>
          <button hidden={catg != "confirm"} onClick={() => confirmBond(bd.id)}>
            Confirm
          </button>
          <button hidden={catg != "close"} onClick={() => closeBond(bd.id)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [balance, setBalance] = useState();
  const [wallet, setWallet] = useState();
  const [admin, setAdmin] = useState();
  const [contract, setContract] = useState();
  const [kit, setKit] = useState();
  const [bonds, setBonds] = useState();
  const [bondsCreated, setBondsCreated] = useState();
  const [bondsToSign, setBondsToSign] = useState([]);
  const [bondsToConfirm, setBondsToConfirm] = useState([]);
  const [bondsToValidate, setBondsToValidate] = useState([]);
  const [bondsToClose, setBondsToClose] = useState([]);
  const [totalAF, setTotalAF] = useState();

  // get both cUSD balance and RP balance
  const getBal = async () => {
    try {
      const balance = await kit.getTotalBalance(wallet);
      const bal = balance.CELO.shiftedBy(-ERC20_DECIMALS).toFixed(2);
      const _contract = new kit.web3.eth.Contract(zbondAbi, zbondAddress);
      try {
        const _admin = await _contract.methods.getAdmin().call();
        setAdmin(_admin);
      } catch (e) {
        console.log(e);
      }

      setBalance(bal);
      setContract(_contract);
    } catch (error) {
      console.log(error);
    }
  };

  // connect wallet to app
  const connectWallet = async () => {
    if (window.celo) {
      try {
        await window.celo.enable();
        const web3 = new Web3(window.celo);
        let kit = newKitFromWeb3(web3);

        const accounts = await kit.web3.eth.getAccounts();
        const defaultAccount = accounts[0];
        kit.defaultAccount = defaultAccount;

        setKit(kit);
        setWallet(defaultAccount);
      } catch (error) {
        console.log(error);
      }
    } else {
      alert(
        "You need to install the celo wallet extension in order to use this app"
      );
    }
  };

  // Get all bonds created from the contract
  const getBonds = async () => {
    const _bondsLength = await contract.methods.getLength().call();
    // const _bondsLength = 2;
    const _bonds = [];
    for (let i = 0; i < _bondsLength; i++) {
      let _bond = new Promise(async (resolve, reject) => {
        let b = await contract.methods.viewBond(i).call();
        resolve({
          id: i,
          description: b[0],
          amount: b[1],
          creator: b[2],
          partyInvolved: b[3],
          confirmations: b[4],
          signed: b[5],
          validated: b[6],
          completed: b[7],
        });
      });
      _bonds.push(_bond);
    }
    const bnds = await Promise.all(_bonds);
    console.log(bnds);
    setBonds(bnds);
  };

  // create new bond
  const createBond = async (description, partyInvolved, expectedAmount) => {
    try {
      const expected = new BigNumber(expectedAmount)
        .shiftedBy(ERC20_DECIMALS)
        .toString();
      await contract.methods
        .createBond(description, expected, partyInvolved)
        .send({ from: wallet });
    } catch (e) {
      console.log(e);
    }
    await getBonds();
  };
  
  const filterBondsToSign = () => {
    if (bonds.length > 0) {
      const _bondsToSign = bonds
        .filter((bond) => bond.partyInvolved == wallet)
        .filter((bond) => bond.signed == false);
      setBondsToSign(_bondsToSign);
    }
  };

  const signBond = async (bondId) => {
    try {
      await contract.methods.signBond(bondId).send({ from: wallet });      
      window.location.reload();
    } catch (e) {
      console.log(e);
    }
  };

  const filterBondsToValidate = () => {
    if (bonds.length > 0) {
      const _bondsToValidate = bonds.filter(
        (bond) => bond.signed == true && bond.validated == false
      );
      setBondsToValidate(_bondsToValidate);
    }
  };

  const validateBond = async (bondId) => {
    try {
      await contract.methods.validateBond(bondId).send({ from: wallet });      
      window.location.reload();
    } catch (e) {
      console.log(e);
    }
  };

  const filterBondsToConfirm = () => {
    if (bonds.length > 0) {
      const _bondsToConfirm = bonds
        .filter(
          (bond) => bond.creator == wallet || bond.partyInvolved == wallet
        )
        .filter((bond) => bond.signed && bond.validated)
        .filter(
          (bond) =>
            Number(bond.confirmations[0]) == 0 ||
            Number(bond.confirmations[1]) == 0
        );
      setBondsToConfirm(_bondsToConfirm);
    }
  };

  const confirmBond = async (bondId) => {
    const bond = bonds[bondId];
    try {
      if (bond.creator == wallet) {
        await contract.methods.makeConfirmation(bondId).send({ from: wallet });
        window.location.reload();
      } else if (bond.partyInvolved == wallet) {
        await contract.methods
          .makeConfirmation(bondId)
          .send({ from: wallet, value: bond.amount });
        window.location.reload();
      }
    } catch (e) {
      console.log(e);
    }
  };

  const filterBondsToClose = () => {
    if (bonds.length > 0) {
      const _bondsToClose = bonds
        .filter((bond) => bond.validated && bond.completed == false)
        .filter(
          (bond) =>
            Number(bond.confirmations[0]) != 0 &&
            Number(bond.confirmations[1]) != 0
        );
      setBondsToClose(_bondsToClose);
    }
  };

  const closeBond = async (bondId) => {
    try {
      await contract.methods.closeBond(bondId).send({ from: wallet });
      window.location.reload();
    } catch (e) {}
  };

  const filterBondsCreated = () => {
    if (bonds.length > 0) {
      const bc = bonds.filter((b) => b.creator == wallet);
      setBondsCreated(bc);
    }
  };

  const withdrawAF = async () => {
    try {
      await contract.methods.withdrawAccumulatedFees().send({ from: wallet });
      window.location.reload();
    } catch (e) {
      console.log(e);
    }
  };

  const getTAF = async () => {
    try {
      const taf = await contract.methods.getTotalAdminFees().call();
      setTotalAF(taf);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    if (kit && wallet) {
      getBal();
    }
  }, [kit, wallet]);

  useEffect(() => {
    if (contract) {
      getBonds();
      getTAF();
    }
  }, [contract]);

  useEffect(() => {
    if (bonds) {
      filterBondsToSign();
      filterBondsToValidate();
      filterBondsToConfirm();
      filterBondsToClose();
      filterBondsCreated();
    }
  }, [bonds]);

  return (
    <>
      {admin ? (
        <div className="app">
          <div className="header">
            <div className="logo">Zero Trust</div>
            <div className="notifs">
              {wallet != admin && (
                <div className="notif">
                  Sign <span>{bondsToSign?.length}</span>
                </div>
              )}
              {wallet == admin && (
                <div className="notif">
                  Validate <span>{bondsToValidate?.length}</span>
                </div>
              )}
              {wallet != admin && (
                <div className="notif">
                  Confirm <span>{bondsToConfirm?.length}</span>
                </div>
              )}
              {wallet == admin && (
                <div className="notif">
                  Close <span>{bondsToClose?.length}</span>
                </div>
              )}
              {wallet == admin && (
                <div className="admin-withd">
                  <div>
                    Accumulated:{" "}
                    <span>
                      {new BigNumber(totalAF)
                        .shiftedBy(-ERC20_DECIMALS)
                        .toString()}{" "}
                      CELO
                    </span>
                  </div>
                  <button onClick={() => withdrawAF()}>Withdraw</button>
                </div>
              )}
            </div>
            <div className="bal">
              Bal: <span>{balance}</span>
            </div>
          </div>
          {wallet == admin ? (
            <>
              <div className="lg-title-heading">Admin panel</div>
              <div className="sm-title">Bonds awaiting validation</div>
              {bondsToValidate?.length > 0 ? (
                bondsToValidate?.map((bond) => (
                  <BondCard
                    bd={bond}
                    catg="validate"
                    validateBond={validateBond}
                  />
                ))
              ) : (
                <div className="none-none">None</div>
              )}
              <div className="sm-title">Bond awaiting to be closed</div>
              {bondsToClose?.length > 0 ? (
                bondsToClose?.map((bond) => (
                  <BondCard bd={bond} catg="close" closeBond={closeBond} />
                ))
              ) : (
                <div className="none-none">None</div>
              )}
            </>
          ) : (
            <>
              <div className="lg-title-heading">
                User{" "}
                <span className="wallet-span">{truncateAddress(wallet)}</span>{" "}
                <MyForm create={createBond} />
              </div>
              <div className="sm-title">List of bonds you have created and their status</div>
              <div className="bonds">
                {bondsCreated?.map((b) => (
                  <BondCard bd={b} />
                ))}
              </div>
              <div className="sm-title">Bonds waiting to be signed</div>
              <div className="bonds">
                {bondsToSign?.length > 0 ? (
                  bondsToSign?.map((bond) => (
                    <BondCard bd={bond} catg="sign" signBond={signBond} />
                  ))
                ) : (
                  <div className="none-none">None</div>
                )}
              </div>
              <div className="sm-title">Bonds waiting to be confirmed</div>
              <div className="bonds">
                {bondsToConfirm?.length > 0 ? (
                  bondsToConfirm?.map((bond) => (
                    <BondCard
                      bd={bond}
                      catg="confirm"
                      confirmBond={confirmBond}
                    />
                  ))
                ) : (
                  <div className="none-none">None</div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="wait-am">Wait a moment ...</div>
      )}
    </>
  );
};

export default App;
