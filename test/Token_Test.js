const We_Made_Future = artifacts.require('We_Made_Future')
const We_Made_Future_USD = artifacts.require('WUSDstablecoin')


require('chai')
  .use(require('chai-as-promised'))
  .should()

function tokens(n) {
  return web3.utils.toWei(n, 'ether');
}

contract('TokenDeploy', ([owner, investor1, investor2]) => {
  let we_made_future, we_made_future_USD

  before(async () => {
    // Load Contracts
    we_made_future = await We_Made_Future.new(We_Made_Future_USD, "We_Made_Future_USD", "WUSD", owner)
    we_made_future_USD = await We_Made_Future_USD.new(We_Made_Future, "We_Made_Future", "WMF", "0x83F00b902cbf06E316C95F51cbEeD9D2572a349a", owner)

    // Transfer all Dapp tokens to farm (1 million)
    await we_made_future.transfer(investor1, tokens('1000000'))

    // Send tokens to investor
    await we_made_future_USD.transfer(investor2, tokens('100'), { from: owner })
  })

  describe('We_Made_Future deployment', async () => {
    it('has a name', async () => {
      const name = await we_made_future.name()
      assert.equal(name, 'We_Made_Future')
    })
  })

  describe('we_made_future_USD deployment', async () => {
    it('has a name', async () => {
      const name = await we_made_future_USD.name()
      assert.equal(name, 'We_Made_Future_USD')
    })
  })


  })