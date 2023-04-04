const { network, ethers } = require("hardhat")

const { developmentChains } = require("../helper-hardhat-config")

const { networkConfig } = require("../helper-hardhat-config")

const {
    storeImages,
    storeTokenUriMetadata,
} = require("../utils/uploadToPinata")
const { verify } = require("../utils/verify")

const imagesLocation = "./images/randomNft"

const metaDataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
}
let tokenUris = [
    "ipfs://QmPsHiBhX2miEK25ovYMM1ZNQ9BTGT85YjRxPfSBnS3Aiq",
    "ipfs://QmW7pnQbVcEPrY29mLFEwEtEsiLnZrV5mgzSrv5T75PjGm",
    "ipfs://QmQ3g8XrpB2qyRMCqynwXwDmdvvbDu5UboZJSLwzfx99RC",
]

const FUND_AMOUNT = ethers.utils.parseEther("1")

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // gett the IPFS hashes of our images

    if (process.env.UPLOAD_TO_PINATA === "true") {
        tokenUris = await handleTokenUris()
    }
    // With our own ipfs
    // pinata

    let vrfCoordinatorV2Address, subscriptionId, VRFCoordinatorV2Mock

    if (developmentChains.includes(network.name)) {
        VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = VRFCoordinatorV2Mock.address
        const tx = await VRFCoordinatorV2Mock.createSubscription()
        const txReceipt = await tx.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2

        subscriptionId = networkConfig[chainId].subscriptionId
    }

    log("--------------------------------------------------")

    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId]["gasLane"],

        networkConfig[chainId]["callbackGasLimit"],
        tokenUris,
        networkConfig[chainId]["mintFee"],
    ]

    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    log("-----------------------------------------------")

    if (developmentChains.includes(network.name)) {
        await VRFCoordinatorV2Mock.addConsumer(
            subscriptionId,
            randomIpfsNft.address
        )
        log("Consumer is added")
    }

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifying...")
        await verify(randomIpfsNft.address, args)
    }
}

async function handleTokenUris() {
    tokenUris = []

    //store the image in IPFS
    // store the meta data in ipfs
    const { responses: imageUploadResponses, files } = await storeImages(
        imagesLocation
    )

    for (imageUploadResponsesIndex in imageUploadResponses) {
        //create metadata
        //upload the metadata

        let tokenUriMetaData = { ...metaDataTemplate }
        // pug.png st-bernard.png
        tokenUriMetaData.name = files[imageUploadResponsesIndex].replace(
            ".png",
            ""
        )
        tokenUriMetaData.description = `an adorable ${tokenUriMetaData.name} pup`

        tokenUriMetaData.image = `ipfs://${
            imageUploadResponses[imageUploadResponsesIndex.IpfsHash]
        }`

        console.log(`Uploading ${tokenUriMetaData.name}...`)

        // store the file

        const metadataUploadResponse = await storeTokenUriMetadata(
            tokenUriMetaData
        )
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }

    console.log("tokenUris Uploaded they are")
    console.log(tokenUris)
    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]
