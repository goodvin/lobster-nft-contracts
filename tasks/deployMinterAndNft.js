require('@nomiclabs/hardhat-truffle5');
const fs = require('fs');

// eslint-disable-next-line
task('deploy-minter-and-nft', 'Deploy Minter and NFT').setAction(async (__, {network}) => {
  const LobstersNft = await artifacts.require('LobstersNft');
  const LobstersMinter = await artifacts.require('LobstersMinter');
  const ERC20 = await artifacts.require('IERC20');

  const { web3 } = LobstersNft;

  const [deployer] = await web3.eth.getAccounts();
  console.log('deployer', deployer);
  const sendOptions = { from: deployer };

  const linkAddress = '0xa36085F69e2889c224210F603D836748e7dC0088';
  const linkFee = web3.utils.toWei('0.1', 'ether');
  const vrfCoordinatorAddress = '0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9';
  const chainlinkKeyhash = '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4';
  const maxTokens = '10000';

  const linkToken = await ERC20.at(linkAddress);

  const lobstersNft = await LobstersNft.new(
    'LOBSTERS',
    'LOBSTERS',
    maxTokens,
    linkAddress,
    vrfCoordinatorAddress,
    linkFee,
    chainlinkKeyhash,
    sendOptions
  );

  await linkToken.transfer(lobstersNft.address, linkFee, sendOptions);

  await lobstersNft.seedReveal(sendOptions);

  console.log('seed:', await lobstersNft.contract.methods.seed().call());

  for(let i = 0; i < 2; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 1000 * 60);
    });
    console.log('seed after', i + 1, 'minutes:', await lobstersNft.contract.methods.seed().call());
  }

  const treeData = JSON.parse(fs.readFileSync('./data/export.json', {encoding: 'utf8'}));

  const lobsterMinter = await LobstersMinter.new(lobstersNft.address, treeData.treeRoot, [], []);
  await lobstersNft.setMinter(lobsterMinter.address, {from: deployer});
  console.log('lobstersNft.address', lobstersNft.address);
  console.log('lobsterMinter.address', lobsterMinter.address);

  if (network.name === 'mainnet') {
    return;
  }

  let totalCount = 0;
  for (let i = 0; i < 1; i++) {
    const {address, count, proof} = treeData.treeLeaves[i];
    totalCount += count;
    console.log('verifyClaim', await lobsterMinter.verifyClaim(address, count.toString(), proof));
    // await lobsterMinter.claim(address, count.toString(), proof);
  }
  console.log('maxTokens', totalCount);

  // for (let i = 0; i < totalCount; i++) {
  //   console.log(i, 'metadata', await lobstersNft.contract.methods.metadataOf(i.toString()).call());
  // }
});
