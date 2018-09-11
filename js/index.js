//js 调用
$(function(){
   //弹窗
   $('#myModal').modal();
   //构造web3对象
   var web3 = new Web3(new Web3.providers.HttpProvider("http://192.168.43.86:8545"));

   //构造crowd合约对象
   var crowdContractAddr = "0xab8dcb99b318f4a53a336c9deaa7dabcb6437634";
   var ownerAddr = "0xBEB75EBDeB4472213e6a8Ee601fA3312BA616a56";
   var crowdObj = new web3.eth.Contract(crowdAbi, crowdContractAddr);

   //监察合约对象是否成功创建
    console.log(crowdObj);

   //定义变量
   var acctAddr;
   var kccContractAddr;
   var mvcContractAddr;
   var kccObj;


    // 登陆按钮被点击
    $(".Login").on("click",function(){
        acctAddr = $("#addressId").val();
        console.log("get acct:" + acctAddr);
        pageLoad();
        $(".close_win").click();
    });
        // $(".MovieName span:last-child").append('三体');  //
        // $(".zhanbi span:last-child").append('800');
        // $(".MVC span:last-child").append('10000');
        // $(".KCC span:last-child").append('0');
        // $(".Time span:last-child").append('1231121');

    //充值kcc
    $(".Recharge").on("click",function(){
        //1. 获得kcc合约地址
        recharge = $(".btn-margin #rcharge").val();
        console.log("recharge:"+recharge)
        //用于判断输入是否为正整数
        var re = /^[0-9]*[0-9]$/i;
        //判断充值输入是否为正整数，且大于0
        if(re.test(recharge) && recharge > 0){
            //调用主合约方法获取KCC和MVC合约地址
            crowdObj.methods.getAddr().call(function(e,r){
                if(!e) {
                    kccContractAddr = r.kaddr;
                    mvcContractAddr = r.maddr;
                    console.log("get addr:",kccContractAddr,mvcContractAddr);
                    //获得kcc合约对象
                    kccObj = new web3.eth.Contract(kccAbi, kccContractAddr);
                    //调用kcc-》airDrop方法
                    kccObj.methods.airDrop(acctAddr, recharge).send(
                        {
                            from : ownerAddr,//owner
                            gas : 300000
                        },function(e,r){
                            if(!e) {
                                //执行众筹信息刷新
                                getMovieName();
                                getCowdAmount();
                                getMVC();
                                getKccBalance();
                                getCrowdTime();
                                alert("充值成功，充值金额"+recharge);
                            }
                            else {
                                alert("失败");
                                console.log("充值失败：",e);
                            }
                        });
                }
            });
        }else{
            alert("请输入大于0的KCC，不可输入除数字外其他字符");
        }

    });

    //投票处理- 此时可以认为合约地址都已经拿到,kcc合约对象，mvc合约地址
    $(".Vote").on("click",function(){
        //获取页面输入的投票份额,也就是购买的众筹份额
        vote = $(".btn-margin #vote").val();
        //用于判断输入是否为正整数
        var re = /^[0-9]*[0-9]$/i;
        //调用主函数获取KCC和MVC合约地址
        crowdObj.methods.getAddr().call(function(e,r){
            if(!e) {
                kccContractAddr = r.kaddr;
                mvcContractAddr = r.maddr;
                console.log("get addr:",kccContractAddr,mvcContractAddr);
                // 获得kcc合约对象
                kccObj = new web3.eth.Contract(kccAbi, kccContractAddr);
                //调用KCC合约函数balanceOf查询众筹参与者账户余额
                kccObj.methods.balanceOf(acctAddr).call(function (e,r) {
                    if(!e){
                        //判断投票输入是否为正整数，且是100的整数倍，且最少100，且账户KCC余额至少有1000个KCC
                        if(re.test(vote) && vote%100===0 && vote >= 100 && r >= 10*vote){
                            //调用kcc合约transfer方法，传入基金会地址和KCC需要花费金额(10倍MVC投票输入金额)
                            kccObj.methods.transfer(ownerAddr, 10*vote).send(
                                {
                                    from : acctAddr,
                                    gas  : 300000
                                },function(e,r){
                                    if(!e) {
                                        console.log("投票成功,KCC减少:"+10*vote);
                                        //获得mvc合约对象
                                        mvcObj = new web3.eth.Contract(mvcAbi, mvcContractAddr);
                                        //调用mvc合约的空投airDrop方法给众筹参与者acctAddr投票份额
                                        mvcObj.methods.airDrop(acctAddr,vote).send(
                                            {
                                                from : ownerAddr,
                                                gas  : 300000
                                            },function(e,r){
                                                if(!e) {
                                                    //执行众筹信息刷新
                                                    getMovieName();
                                                    getCowdAmount();
                                                    getMVC();
                                                    getKccBalance();
                                                    getCrowdTime();
                                                    alert("投票成功，购买份额："+vote);
                                                }
                                                else {
                                                    alert("投票失败");
                                                    console.log("失败:",e);
                                                }
                                            });
                                    }
                                });
                        }else{
                            alert("请输入最小100个数字的MVC，且必须为100的整数倍，不可输入除数字外其他字符，确保账户KCC余额大于1000且按照1000KCC:100MVC比例可以足额兑换MVC");
                        }
                    }
                });
            }
        });
    });

    $(".Refresh").on("click",function () {
        getMovieName();
        getCowdAmount();
        getMVC();
        getKccBalance();
        getCrowdTime();
    })

    function getMovieName() {
        mvcObj.methods.desc().call(function (e,r) {
            if(!e){
                $(".MovieName span:nth-child(2)").html("《"+r+"》");
            }
        })
    }
    //显示持有众筹份额和MVC持有份额占比
    function getCowdAmount() {
        mvcObj.methods.crowInfo(acctAddr).call(function (e,r) {
            $(".CrowdAmount span:nth-child(2)").html(r._amount);
            CrowdProportion(r._amount)
        })
    }

    //显示MVC数量
    function getMVC() {
        mvcObj.methods.totalSupply().call(function (e,r) {
            $(".MVC span:nth-child(2)").html(r);
        })
    }

    //显示KCC余额
    function getKccBalance() {
        kccObj.methods.balanceOf(acctAddr).call(function (e,r) {
            if(!e){
                $(".KCC span:nth-child(2)").html(r);
            }
        });
    }

    //显示众筹时间
    function getCrowdTime() {
        mvcObj.methods.crowInfo(acctAddr).call(function (e,r) {
            $(".Time span:nth-child(2)").html(r._crowdTime==0?"未开始投票":getDate(r._crowdTime));
        })
    }

    //获取MVC持有份额占比
    function CrowdProportion(crowdAmount) {
        mvcObj.methods.totalSupply().call(function (e,r) {
            if(!e){
                $(".CrowdProportion span:nth-child(2)").html(crowdAmount/r*100 + '%');
            }
        })
    }

//创建页面初始化方法
    function pageLoad(){
        console.log('2-crowdObj:'+crowdObj);
        crowdObj.methods.getAddr().call(function(e,r){
            console.log('3-crowdObj:'+crowdObj);
            // if(!e) {
                console.log('开始获得kcc,mvc合约地址');
                console.log(r)
                kccContractAddr = r.kaddr;
                mvcContractAddr = r.maddr;
                // console.log("get addr:",kccContractAddr,mvcContractAddr);
                //2. 获得kcc合约对象
                kccObj = new web3.eth.Contract(kccAbi, kccContractAddr);
                // console.log('kccObj:',kccObj);
                //3. 获得mvc合约对象
                mvcObj = new web3.eth.Contract(mvcAbi, mvcContractAddr);
                // console.log('mvcObj:',mvcObj);
                getMovieName();
                getCowdAmount();
                getMVC();
                getKccBalance();
                getCrowdTime();
                console.log('初始化完成');
            // }else{
            //     alert('初始化失败');
            // }
        });
    }

    //时间戳转日期
    function getDate(timestamp) {
        var date = new Date(timestamp * 1000);//时间戳为10位需*1000，时间戳为13位的话不需乘1000
        var Y = date.getFullYear() + '-';
        var M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
        var D = date.getDate() + ' ';
        var h = date.getHours() + ':';
        var m = date.getMinutes() + ':';
        var s = date.getSeconds();
        return Y+M+D+h+m+s;
    }

  })