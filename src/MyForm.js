import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";

function MyForm({ create }) {
  const [show, setShow] = useState(false);
  const [partyInvolved, setPartyInvolved] = useState();
  const [description, setDescription] = useState();
  const [expectedAmount, setExpectedAmount] = useState();

  const submitMyForm = async () => {
    await create(description, partyInvolved, expectedAmount);
    console.log("Created new bond");
    handleClose();
  };

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <>
      <Button variant="primary" onClick={handleShow}>
        New Bond
      </Button>

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Bond</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
              <Form.Label>Including</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter second party wallet address"
                onChange={(e) => setPartyInvolved(e.target.value)}
              />
            </Form.Group>
            <Form.Group
              className="mb-3"
              controlId="exampleForm.ControlTextarea1"
            >
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput2">
              <Form.Label>Amount Expected</Form.Label>
              <Form.Control
                type="number"
                placeholder="Amount you are expecting from second party (in CELO)"
                onChange={(e) => setExpectedAmount(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={() => submitMyForm()}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default MyForm;
