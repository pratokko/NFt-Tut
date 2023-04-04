const { network, deployments, getNamedAccounts, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("BasicNft", function () {
          let basicNft, deployer
          beforeEach(async function () {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["basicnft"])
              basicNft = await ethers.getContract("BasicNft")
          })

          describe("constructor", function () {
              it("initializes the contract correctly", async function () {
                  const name = await basicNft.name()
                  const symbol = await basicNft.symbol()
                  const tokenCounter = await basicNft.getTokenCounter()
                  assert.equal(name, "Dogie")
                  assert.equal(symbol, "DOG")
                  assert.equal(tokenCounter, "0")
              })
          })

          describe("mintNft", function () {
              beforeEach(async function () {
                  const txResponse = await basicNft.mintNft()
                  await txResponse.wait(1)
              })
              it("Allows users to mint an NFT, and updates appropriately", async function () {
                  const tokenURI = await basicNft.tokenURI(0)
                  const tokenCounter = await basicNft.getTokenCounter()

                  assert.equal(tokenCounter.toString(), "1")
                  assert.equal(tokenURI, await basicNft.TOKEN_URI())
              })

              it("shows the correct balance and owner of an nft", async function () {
                  const deployerAddress = deployer.address

                  const deployerBalance = await basicNft.balanceOf(
                      deployerAddress
                  )

                  const owner = await basicNft.ownerOf("0")

                  assert.equal(deployerBalance.toString(), "1")
                  assert.equal(owner, deployerAddress)
              })
          })
      })
