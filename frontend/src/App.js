import React, { Component } from 'react'
import Web3 from 'web3'
import WUSDStablecoin from './abis/WUSDStablecoin.json'
import We_Made_Future from './abis/We_Made_Future.json'
import WUSDPool from './abis/WUSDPool.json'
import Navbar from './Navbar'
import Main from './Main'
import './App.css'

class App extends Component {

  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadBlockchainData() {
    const web3 = window.web3

    const accounts = await web3.eth.getAccounts()
    this.setState({ account: accounts[0] })

    const networkId = await web3.eth.net.getId()

    // Load WUSDStablecoin
    const WUSDStablecoinData = WUSDStablecoin.networks[networkId]
    if(WUSDStablecoinData) {
      const wusdStablecoin = new web3.eth.Contract(WUSDStablecoin.abi, WUSDStablecoinData.address)
      this.setState({ wusdStablecoin })
      let WUSDStablecoinBalance = await wusdStablecoin.methods.balanceOf(this.state.account).call()
      this.setState({ WUSDStablecoinBalance: WUSDStablecoinBalance.toString() })
    } else {
      window.alert('WUSDStablecoin contract not deployed to detected network.')
    }

    // Load We_Made_Future
    const We_Made_FutureData = We_Made_Future.networks[networkId]
    if(We_Made_FutureData) {
      const we_Made_Future = new web3.eth.Contract(We_Made_Future.abi, We_Made_FutureData.address)
      this.setState({ we_Made_Future })
      let We_Made_FutureBalance = await we_Made_Future.methods.balanceOf(this.state.account).call()
      this.setState({ We_Made_FutureBalance: We_Made_FutureBalance.toString() })
    } else {
      window.alert('We_Made_Future contract not deployed to detected network.')
    }

    // Load WUSDPool
    const WUSDPoolData = WUSDPool.networks[networkId]
    if(WUSDPoolData) {
      const wUSDPool = new web3.eth.Contract(WUSDPool.abi, WUSDPoolData.address)
      this.setState({ wUSDPool })
      let mintPaused = await wUSDPool.methods.mintPaused().call()
      this.setState({ mintPaused: mintPaused.toString() }) // Parameter 오류
      let redeemPaused = await wUSDPool.methods.redeemPaused().call()// Parameter 오류
      this.setState({ redeemPaused: redeemPaused.toString() }) 
    } else {
      window.alert('WUSDPool contract not deployed to detected network.')
    }

    this.setState({ loading: false })
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  transferTest = () => {
    this.setState({loading:true})
      this.state.wusdStablecoin.methods.transfer('0xe7f890A0CB4c0Cbd68848F26F0998562502323Dc', window.web3.utils.toWei('100')).send({from:this.state.account}).on('transHash', (hash => {
        this.setState({loading: false})
      }))
  }

  mint1t1WUSD = (WMF_amount_d18, WUSD_out_min) => {
    this.setState({ loading: true })
    this.state.WUSDStablecoin.methods.approve(this.state.WUSDPool._address, WMF_amount_d18).send({ from: this.state.account }).on('transactionHash', (hash) => {
      this.state.WUSDPool.methods.mint1t1WUSD(WMF_amount_d18, WUSD_out_min).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.setState({ loading: false })
      })
    })
  }

  mintAlgorithmicWUSD = (collateral_amount, WUSD_out_min) => {
    this.setState({ loading: true })
    this.state.WUSDStablecoin.methods.approve(this.state.WUSDPool._address, collateral_amount).send({ from: this.state.account }).on('transactionHash', (hash) => {
      this.state.WUSDPool.methods.mintAlgorithmicWUSD(collateral_amount, WUSD_out_min).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.setState({ loading: false })
      })
    })
  }

  mintFractionalWUSD = (collateral_amount, WMF_amount, WUSD_out_min) => {
    this.setState({ loading: true })
    this.state.WUSDStablecoin.methods.approve(this.state.WUSDPool._address, collateral_amount).send({ from: this.state.account }).on('transactionHash', (hash) => {
      this.state.WUSDPool.methods.mintFractionalWUSD(collateral_amount, WMF_amount, WUSD_out_min).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.setState({ loading: false })
      })
    })
  }

  redeem1t1WUSD = (WUSD_amount, COLLATERAL_out_min) => {
    this.setState({ loading: true })
    this.state.WUSDStablecoin.methods.approve(this.state.WUSDPool._address, WUSD_amount).send({ from: this.state.account }).on('transactionHash', (hash) => {
      this.state.WUSDPool.methods.redeem1t1WUSD(WUSD_amount, COLLATERAL_out_min).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.state.WUSDPool.methods.collectRedemption().send({ from: this.state.account }).on('transactionHash', (hash) => {
          this.setState({ loading: false })
        })
      })
    })
  }

  redeemAlgorithmicWUSD = (WUSD_amount, WMF_out_min) => {
    this.setState({ loading: true })
    this.state.WUSDStablecoin.methods.approve(this.state.WUSDPool._address, WUSD_amount).send({ from: this.state.account }).on('transactionHash', (hash) => {
      this.state.WUSDPool.methods.redeemAlgorithmicWUSD(WUSD_amount, WMF_out_min).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.state.WUSDPool.methods.collectRedemption().send({ from: this.state.account }).on('transactionHash', (hash) => {
          this.setState({ loading: false })
        })
      })
    })
  }

  redeemFractionalWUSD = (WUSD_amount, WMF_out_min, COLLATERAL_out_min) => {
    this.setState({ loading: true })
    this.state.WUSDStablecoin.methods.approve(this.state.WUSDPool._address, WUSD_amount).send({ from: this.state.account }).on('transactionHash', (hash) => {
      this.state.WUSDPool.methods.redeemFractionalWUSD(WUSD_amount, WMF_out_min, COLLATERAL_out_min).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.state.WUSDPool.methods.collectRedemption().send({ from: this.state.account }).on('transactionHash', (hash) => {
          this.setState({ loading: false })
        })
      })
    })
  }

  recollateralizeWUSD = (collateral_amount, WMF_out_min) => {
    this.setState({ loading: true })
    this.state.WUSDStablecoin.methods.approve(this.state.WUSDPool._address, collateral_amount).send({ from: this.state.account }).on('transactionHash', (hash) => {
      this.state.WUSDPool.methods.recollateralizeWUSD(collateral_amount, WMF_out_min).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.state.WUSDPool.methods.collectRedemption().send({ from: this.state.account }).on('transactionHash', (hash) => {
          this.setState({ loading: false })
        })  
      })
    })
  }

  buyBackWMF = (WMF_amount, COLLATERAL_out_min) => {
    this.setState({ loading: true })
    this.state.WUSDStablecoin.methods.approve(this.state.WUSDPool._address, WMF_amount).send({ from: this.state.account }).on('transactionHash', (hash) => {
      this.state.WUSDPool.methods.redeemFractionalWUSD(WMF_amount, COLLATERAL_out_min).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.state.WUSDPool.methods.collectRedemption().send({ from: this.state.account }).on('transactionHash', (hash) => {
          this.setState({ loading: false })
        })
      })
    })
  }

  constructor(props) {
    super(props)
    this.state = {
      account: '0x0',
      wusdStablecoin: {},
      we_Made_Future: {},
      WUSDStablecoinBalance: '',
      We_Made_FutureBalance: '',
      wUSDPool: {},
      mintPaused: false,
      loading: true
    }
  }

  render() {
    let content
    if(this.state.loading) {
      content = <p id="loader" className="text-center">Loading...</p>
    } else {
      content = <Main
        WUSDStablecoinBalance={this.state.WUSDStablecoinBalance}
        We_Made_FutureBalance={this.state.We_Made_FutureBalance}
        mintPaused={this.state.mintPaused}
        redeemAlgorithmicWUSD={this.redeemAlgorithmicWUSD}
        mintAlgorithmicWUSD={this.mintAlgorithmicWUSD}
        transferTest={this.transferTest}
      />
    }

    return (
      <div>
        <Navbar account={this.state.account} />
        <div className="container-fluid mt-5">
          <div className="row">
            <main role="main" className="col-lg-12 ml-auto mr-auto" style={{ maxWidth: '600px' }}>
              <div className="content mr-auto ml-auto">
                <a
                  href="http://www.dappuniversity.com/bootcamp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                </a>

                {content}

              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
