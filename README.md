# Zero Trust 
A decentralised trustless system built to solve the problem of investing trust in the second party in a business and getting dissapointed, but rather on a platform built on the blockchain which is accessible to everybody

# Preview 
![image](https://user-images.githubusercontent.com/111018723/190308394-6909cd20-53c5-46e4-910a-3f1d6dde7376.png)
![image](https://user-images.githubusercontent.com/111018723/190308774-71ba5640-a881-4e66-8a54-4a6093f54219.png)


# Hosted URL 
Click [here](https://adamtigre.github.io/zero-trust) to launch app

# How to Test
**Step 1**

Create 3 different accounts on your Celo extension wallet. (first account for admin, second account for first party in the transaction, third account for second party)

**Step 2**

Compile and redeploy contract with account 1(admin account)

**Step 3** 

Switch wallet to account 2 and create a new bond with account 2 (first party in business) using account 3 wallet address as the "Party involved"

**Step 4**

Switch wallet to account 3 and sign the pending bond

**Step 5**

Switch to admin account (account 1) and validate the pending bond

**Step 6**

Switch to account 2 (first party) to complete a transaction, and then to account 3 (second party) to complete transaction as well. (Note: Both parties must complete a transaction before it can be closed by the admin)

**Step 7** 

Switch to admin account (account 1) and close the bond. At this point, funds will be transferred to wallet addresses as neccessary.

**Step 8**

Check the three accounts (admin, first party, second party) to see how funds were distrubuted and status of the bond)


