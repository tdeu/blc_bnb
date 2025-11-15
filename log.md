Selected Expiration Debug: {dateISO: '2025-11-15T20:04:00.000Z', dateLocal: '15/11/2025 20:04:00', dateUnix: 1763237040, nowUnix: 1763236872, nowISO: '2025-11-15T20:01:12.117Z', …}
CreateMarket.tsx:131 ✅ Expiration date is valid (with blockchain safety buffer)
CreateMarket.tsx:141 🔍 DEBUG: selectedImage exists? false
CreateMarket.tsx:142 🔍 DEBUG: selectedImage details: null
CreateMarket.tsx:171 📤 Creating market with data: {claim: 'la belgique est plus petite que la france', imageUrl: undefined, hasImage: false}
App.tsx:1211 🔗 Attempting to create market on BSC... {isWalletConnected: true, isFactoryConfigured: true, marketId: 'market_1763236872127_yt2jrl1d6'}
App.tsx:1220 ⏳ Starting blockchain deployment for market: market_1763236872127_yt2jrl1d6
factoryService.ts:73 🏭 Creating market on BSC factory: {question: 'la belgique est plus petite que la france', endTime: Sat Nov 15 2025 20:04:00 GMT+0000 (heure moyenne de Greenwich), category: 'Climate', allowEarlyResolution: false}
factoryService.ts:99 📝 Calling factory.createMarket with: {question: 'la belgique est plus petite que la france', endTime: 1763237040, collateral: '0.001 BNB'}
marketStatusService.ts:77 🔍 Checking 1 markets for status updates...
factoryService.ts:116 ⏳ Transaction sent: 0x5ae2784cdcd2a1a172a4e124474a4b427284dd4023646aa9b50d54e19c3bd634
factoryService.ts:122 ✅ Transaction confirmed: ContractTransactionReceipt {provider: _BrowserProvider, to: '0x8f75f2408478CB92D7cA2f10cc3F76d0c01CBb76', from: '0x17B40492e3d7A2A2bA2FE0c09322CF9e5563Cb0b', contractAddress: null, hash: '0x5ae2784cdcd2a1a172a4e124474a4b427284dd4023646aa9b50d54e19c3bd634', …}
factoryService.ts:147 🎉 Market created:
factoryService.ts:148    ID: 0xe1a05dd75883608cff6d4f0a54b1c78707224a590650a77c5f2d95fd997c3f4f
factoryService.ts:149    Address: 0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1
App.tsx:1232 ✅ Market created on BSC: 0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1
pendingMarketsService.ts:96 📝 Market submitted to Supabase for approval: la belgique est plus petite que la france
App.tsx:1276 📝 Market submitted to Supabase for admin approval with contract address 0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1
App.tsx:1317 🔥 About to call recordMarketCreation with newMarket: {id: 'market_1763236872127_yt2jrl1d6', claim: 'la belgique est plus petite que la france', category: 'Climate', source: '', description: 'la belgique est plus petite que la france', …}
App.tsx:1318 🔥 newMarket.imageUrl specifically: undefined
userDataService.ts:224 🚨 RECORD MARKET CREATION CALLED! {walletAddress: '0x17b40492e3d7a2a2ba2fe0c09322cf9e5563cb0b', marketId: 'market_1763236872127_yt2jrl1d6', claim: 'la belgique est plus petite que la france', transactionHash: 'pending-1763236891823', fullMarketData: {…}, …}
userDataService.ts:247 🔍 DEBUG: Recording market with imageUrl: undefined
userDataService.ts:248 ✅ Market creation recorded locally: {id: 'market_1763236872127_yt2jrl1d6', claim: 'la belgique est plus petite que la france', createdAt: Sat Nov 15 2025 20:01:31 GMT+0000 (heure moyenne de Greenwich), transactionHash: 'pending-1763236891823', submitterAddress: '0x17b40492e3d7a2a2ba2fe0c09322cf9e5563cb0b', …}
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236891838
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: markets
App.tsx:1358 🎯 About to render main content
App.tsx:1363 🏪 Rendering unified markets with 156 markets
App.tsx:437 🔥 State changed - isLoading: false showOnboarding: false currentTab: markets
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236895063
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: admin
App.tsx:1358 🎯 About to render main content
App.tsx:437 🔥 State changed - isLoading: false showOnboarding: false currentTab: admin
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236895100
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: admin
App.tsx:1358 🎯 About to render main content
approvedMarketsService.ts:222 🔍 NEW MARKET CONTRACT DEBUG: null
approvedMarketsService.ts:223 🔍 NEW MARKET TYPE: object
approvedMarketsService.ts:224 🔍 NEW MARKET ID: market_1758612204970_xgolhnr9c
approvedMarketsService.ts:222 🔍 NEW MARKET CONTRACT DEBUG: null
approvedMarketsService.ts:223 🔍 NEW MARKET TYPE: object
approvedMarketsService.ts:224 🔍 NEW MARKET ID: market_1758612204970_xgolhnr9c
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236896911
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: admin
App.tsx:1358 🎯 About to render main content
approvedMarketsService.ts:222 🔍 NEW MARKET CONTRACT DEBUG: null
approvedMarketsService.ts:223 🔍 NEW MARKET TYPE: object
approvedMarketsService.ts:224 🔍 NEW MARKET ID: market_1758612204970_xgolhnr9c
MarketApproval.tsx:131 🏛️ Admin dashboard rendering market: {id: 'market_1763236872127_yt2jrl1d6', question: 'la belgique est plus petite que la france', hasImageUrl: false, imageUrl: null, imageUrlType: 'object', …}
@supabase_supabase-js.js?v=304d513d:4300  GET https://fiopwubhukuxmjgujtxk.supabase.co/rest/v1/resolution_scores?select=*&market_id=eq.market_1763234009325_85xmsqer4 404 (Not Found)
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4300
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4321
fulfilled @ @supabase_supabase-js.js?v=304d513d:4273
Promise.then
step @ @supabase_supabase-js.js?v=304d513d:4286
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4288
__awaiter6 @ @supabase_supabase-js.js?v=304d513d:4270
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4311
then @ @supabase_supabase-js.js?v=304d513d:90Understand this error
@supabase_supabase-js.js?v=304d513d:4300  GET https://fiopwubhukuxmjgujtxk.supabase.co/rest/v1/resolution_scores?select=*&market_id=eq.market_1763233613830_1gc5l66uj 404 (Not Found)
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4300
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4321
fulfilled @ @supabase_supabase-js.js?v=304d513d:4273
Promise.then
step @ @supabase_supabase-js.js?v=304d513d:4286
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4288
__awaiter6 @ @supabase_supabase-js.js?v=304d513d:4270
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4311
then @ @supabase_supabase-js.js?v=304d513d:90Understand this error
@supabase_supabase-js.js?v=304d513d:4300  GET https://fiopwubhukuxmjgujtxk.supabase.co/rest/v1/resolution_scores?select=*&market_id=eq.market_1763203247188_8yn0l7r2z 404 (Not Found)
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4300
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4321
fulfilled @ @supabase_supabase-js.js?v=304d513d:4273
Promise.then
step @ @supabase_supabase-js.js?v=304d513d:4286
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4288
__awaiter6 @ @supabase_supabase-js.js?v=304d513d:4270
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4311
then @ @supabase_supabase-js.js?v=304d513d:90Understand this error
@supabase_supabase-js.js?v=304d513d:4300  GET https://fiopwubhukuxmjgujtxk.supabase.co/rest/v1/resolution_scores?select=*&market_id=eq.market_1763191574999_vm1w3ixua 404 (Not Found)
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4300
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4321
fulfilled @ @supabase_supabase-js.js?v=304d513d:4273
Promise.then
step @ @supabase_supabase-js.js?v=304d513d:4286
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4288
__awaiter6 @ @supabase_supabase-js.js?v=304d513d:4270
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4311
then @ @supabase_supabase-js.js?v=304d513d:90Understand this error
@supabase_supabase-js.js?v=304d513d:4300  GET https://fiopwubhukuxmjgujtxk.supabase.co/rest/v1/resolution_scores?select=*&market_id=eq.market_1763056480333_0amimmedk 404 (Not Found)
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4300
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4321
fulfilled @ @supabase_supabase-js.js?v=304d513d:4273
Promise.then
step @ @supabase_supabase-js.js?v=304d513d:4286
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4288
__awaiter6 @ @supabase_supabase-js.js?v=304d513d:4270
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4311
then @ @supabase_supabase-js.js?v=304d513d:90Understand this error
adminService.ts:138 Admin 0x17b40492e3d7a2a2ba2fe0c09322cf9e5563cb0b approving market market_1763236872127_yt2jrl1d6
MarketApproval.tsx:131 🏛️ Admin dashboard rendering market: {id: 'market_1763236872127_yt2jrl1d6', question: 'la belgique est plus petite que la france', hasImageUrl: false, imageUrl: null, imageUrlType: 'object', …}
pendingMarketsService.ts:202 ✅ Market approved in Supabase: la belgique est plus petite que la france
approvedMarketsService.ts:48 ✅ Market stored in Supabase: la belgique est plus petite que la france
App.tsx:800 🎉 Market approved and added to homepage: la belgique est plus petite que la france
adminService.ts:374 🔗 Activating market market_1763236872127_yt2jrl1d6 on-chain...
adminService.ts:394 📝 Calling contract.approveMarket() for 0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1
adminService.ts:400 🔐 Using signer address: 0x17B40492e3d7A2A2bA2FE0c09322CF9e5563Cb0b
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236901238
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: admin
App.tsx:1358 🎯 About to render main content
MarketApproval.tsx:131 🏛️ Admin dashboard rendering market: {id: 'market_1763236872127_yt2jrl1d6', question: 'la belgique est plus petite que la france', hasImageUrl: false, imageUrl: null, imageUrlType: 'object', …}
App.tsx:446 🔥 Markets changed - count: 157 (loaded from Supabase)
adminService.ts:413 📊 Current market status: 0 (type: bigint)
adminService.ts:417 ✅ Market is Submited, calling approveMarket()...
adminService.ts:419 📤 Transaction sent: 0xe6724d47d019af41796673d834754c700c88a723fb3e968066efe9f0260cfe5e
adminService.ts:422 ✅ Market market_1763236872127_yt2jrl1d6 activated on-chain! Gas used: 51095
adminService.ts:426 🎉 New market status: 1 (should be 1 for Open)
adminService.ts:433 ✅ Market market_1763236872127_yt2jrl1d6 successfully activated on BSC
marketStatusService.ts:77 🔍 Checking 2 markets for status updates...
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236912449
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: markets
App.tsx:1358 🎯 About to render main content
App.tsx:1363 🏪 Rendering unified markets with 157 markets
App.tsx:437 🔥 State changed - isLoading: false showOnboarding: false currentTab: markets
BettingMarkets.tsx:229 🎯 BettingMarkets: handleOpenBetDialog called with market: {id: 'market_1763236872127_yt2jrl1d6', claim: 'la belgique est plus petite qu'}
@radix-ui_react-alert-dialog@1__1__6.js?v=3297ed8c:170 `AlertDialogContent` requires a description for the component to be accessible for screen reader users.

You can add a description to the `AlertDialogContent` by passing a `AlertDialogDescription` component as a child, which also benefits sighted users by adding visible context to the dialog.

Alternatively, you can use your own component as a description by assigning it an `id` and passing the same value to the `aria-describedby` prop in `AlertDialogContent`. If the description is confusing or duplicative for sighted users, you can use the `@radix-ui/react-visually-hidden` primitive as a wrapper around your description component.

For more information, see https://radix-ui.com/primitives/docs/components/alert-dialog
(anonymous) @ @radix-ui_react-alert-dialog@1__1__6.js?v=3297ed8c:170
commitHookEffectListMount @ chunk-7WYZBWXT.js?v=30959415:16963
commitPassiveMountOnFiber @ chunk-7WYZBWXT.js?v=30959415:18206
commitPassiveMountEffects_complete @ chunk-7WYZBWXT.js?v=30959415:18179
commitPassiveMountEffects_begin @ chunk-7WYZBWXT.js?v=30959415:18169
commitPassiveMountEffects @ chunk-7WYZBWXT.js?v=30959415:18159
flushPassiveEffectsImpl @ chunk-7WYZBWXT.js?v=30959415:19543
flushPassiveEffects @ chunk-7WYZBWXT.js?v=30959415:19500
commitRootImpl @ chunk-7WYZBWXT.js?v=30959415:19469
commitRoot @ chunk-7WYZBWXT.js?v=30959415:19330
performSyncWorkOnRoot @ chunk-7WYZBWXT.js?v=30959415:18948
flushSyncCallbacks @ chunk-7WYZBWXT.js?v=30959415:9166
(anonymous) @ chunk-7WYZBWXT.js?v=30959415:18677Understand this warning
chunk-IPPXSQ2O.js?v=30959415:336 Warning: Missing `Description` or `aria-describedby={undefined}` for {AlertDialogContent}.
(anonymous) @ chunk-IPPXSQ2O.js?v=30959415:336
commitHookEffectListMount @ chunk-7WYZBWXT.js?v=30959415:16963
commitPassiveMountOnFiber @ chunk-7WYZBWXT.js?v=30959415:18206
commitPassiveMountEffects_complete @ chunk-7WYZBWXT.js?v=30959415:18179
commitPassiveMountEffects_begin @ chunk-7WYZBWXT.js?v=30959415:18169
commitPassiveMountEffects @ chunk-7WYZBWXT.js?v=30959415:18159
flushPassiveEffectsImpl @ chunk-7WYZBWXT.js?v=30959415:19543
flushPassiveEffects @ chunk-7WYZBWXT.js?v=30959415:19500
commitRootImpl @ chunk-7WYZBWXT.js?v=30959415:19469
commitRoot @ chunk-7WYZBWXT.js?v=30959415:19330
performSyncWorkOnRoot @ chunk-7WYZBWXT.js?v=30959415:18948
flushSyncCallbacks @ chunk-7WYZBWXT.js?v=30959415:9166
(anonymous) @ chunk-7WYZBWXT.js?v=30959415:18677Understand this warning
BettingMarkets.tsx:261 🎯 BettingMarkets: handlePlaceBet called with selectedMarket: {id: 'market_1763236872127_yt2jrl1d6', claim: 'la belgique est plus petite qu'}
App.tsx:930 🏪 Market found for trading: {id: 'market_1763236872127_yt2jrl1d6', claim: 'la belgique est plus petite que la france', contractAddress: '0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1'}
userDataService.ts:208 ✅ Bet recorded locally: {id: 'market_1763236872127_yt2jrl1d6-1763236928711', marketId: 'market_1763236872127_yt2jrl1d6', marketClaim: 'la belgique est plus petite que la france', position: 'yes', amount: 25, …}
App.tsx:973 🔍 BSC connection status: {walletConnected: true}
App.tsx:979 ✅ Using existing market contract address: 0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1
App.tsx:1001 📝 Proceeding with trade placement for market market_1763236872127_yt2jrl1d6. Contract: 0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1
App.tsx:1004 🚀 Placing trade on BSC blockchain contract: 0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236928713
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: markets
App.tsx:1358 🎯 About to render main content
App.tsx:1363 🏪 Rendering unified markets with 157 markets
App.tsx:450 🔥 UserProfile changed: exists
App.tsx:1017 🎲 Placing bet on blockchain using contractService...
contractService.ts:512 💰 Cost for 25.0 shares: 12.577160493827160475 CAST
contractService.ts:513 🛡️ Max cost with 5% slippage: 13.206018518518518498 CAST
contractService.ts:522 📝 Approving 13.206018518518518498 CAST for market 0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1...
contractService.ts:524 ⏳ Waiting for approval transaction: 0x57f434531aa787238a46250ae1cbcb656f46e6f5f335434c45c2abc7e1b0590f
contractService.ts:528 ✅ Approval confirmed
contractService.ts:531 🎲 Placing YES bet...
marketStatusService.ts:77 🔍 Checking 2 markets for status updates...
contractService.ts:533 ⏳ Waiting for bet transaction: 0xefb7e086fd6b8f21e7fdc2fafa98a947ea02fe6185fe9b0f3291c36765d7724b
contractService.ts:537 ✅ Bet placed successfully!
App.tsx:1034 ✅ Transaction confirmed: 0xefb7e086fd6b8f21e7fdc2fafa98a947ea02fe6185fe9b0f3291c36765d7724b
App.tsx:1067 🔄 Refreshing wallet balances after successful trade...
App.tsx:1103 🎯 Refreshing market odds after trade placement for market: market_1763236872127_yt2jrl1d6
App.tsx:1106 📍 Using contract address: 0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1
App.tsx:1107 ⏰ Setting refresh timeouts after transaction sent...
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236949024
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: markets
App.tsx:1358 🎯 About to render main content
App.tsx:1363 🏪 Rendering unified markets with 157 markets
walletService.ts:125 🔄 Attempting to get balance (attempt 1/3)...
App.tsx:1111 🚀 EXECUTING refreshMarketOddsWithAddress (attempt 1)...
App.tsx:188 🔄 Refreshing market odds for market_1763236872127_yt2jrl1d6 using direct BSC contract address: 0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1
walletService.ts:127 ✅ Balance retrieved successfully
App.tsx:1075 💰 Balance update after trade: {bnb: '0.3209463694', cast: '9999827.24512603790371047', change: 'BNB: -0.0037 (gas fees)', stakePaid: '25 CAST (from CAST balance)'}
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236952315
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: markets
App.tsx:1358 🎯 About to render main content
App.tsx:1363 🏪 Rendering unified markets with 157 markets
App.tsx:228 📊 Fetched data from blockchain: {yesOdds: '1.976', noOdds: '2.025', yesProb: '50.0%', noProb: '50.0%', yesShares: '1025.00', …}
App.tsx:241 🔄 State update for market market_1763236872127_yt2jrl1d6: {found: true, oldYesOdds: 2, newYesOdds: 1.975609756097561, oldNoOdds: 2, newNoOdds: 2.025, …}
App.tsx:270 ✅ Market odds updated for market_1763236872127_yt2jrl1d6 using direct address: {yesOdds: '1.976', noOdds: '2.025', yesProb: '50.0%', noProb: '50.0%'}
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236952712
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: markets
App.tsx:1358 🎯 About to render main content
App.tsx:1363 🏪 Rendering unified markets with 157 markets
App.tsx:446 🔥 Markets changed - count: 157 (loaded from Supabase)
App.tsx:288 💾 Saved odds to Supabase for market market_1763236872127_yt2jrl1d6
App.tsx:1116 🔄 EXECUTING refreshMarketOddsWithAddress (attempt 2)...
App.tsx:188 🔄 Refreshing market odds for market_1763236872127_yt2jrl1d6 using direct BSC contract address: 0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1
App.tsx:228 📊 Fetched data from blockchain: {yesOdds: '1.976', noOdds: '2.025', yesProb: '50.0%', noProb: '50.0%', yesShares: '1025.00', …}
App.tsx:241 🔄 State update for market market_1763236872127_yt2jrl1d6: {found: true, oldYesOdds: 1.975609756097561, newYesOdds: 1.975609756097561, oldNoOdds: 2.025, newNoOdds: 2.025, …}
App.tsx:270 ✅ Market odds updated for market_1763236872127_yt2jrl1d6 using direct address: {yesOdds: '1.976', noOdds: '2.025', yesProb: '50.0%', noProb: '50.0%'}
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236957306
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: markets
App.tsx:1358 🎯 About to render main content
App.tsx:1363 🏪 Rendering unified markets with 157 markets
App.tsx:446 🔥 Markets changed - count: 157 (loaded from Supabase)
App.tsx:288 💾 Saved odds to Supabase for market market_1763236872127_yt2jrl1d6
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236960354
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: admin
App.tsx:1358 🎯 About to render main content
App.tsx:437 🔥 State changed - isLoading: false showOnboarding: false currentTab: admin
App.tsx:1121 🔄 EXECUTING refreshMarketOddsWithAddress (attempt 3)...
App.tsx:188 🔄 Refreshing market odds for market_1763236872127_yt2jrl1d6 using direct BSC contract address: 0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1
App.tsx:228 📊 Fetched data from blockchain: {yesOdds: '1.976', noOdds: '2.025', yesProb: '50.0%', noProb: '50.0%', yesShares: '1025.00', …}
App.tsx:241 🔄 State update for market market_1763236872127_yt2jrl1d6: {found: true, oldYesOdds: 1.975609756097561, newYesOdds: 1.975609756097561, oldNoOdds: 2.025, newNoOdds: 2.025, …}
App.tsx:270 ✅ Market odds updated for market_1763236872127_yt2jrl1d6 using direct address: {yesOdds: '1.976', noOdds: '2.025', yesProb: '50.0%', noProb: '50.0%'}
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236964301
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: admin
App.tsx:1358 🎯 About to render main content
App.tsx:446 🔥 Markets changed - count: 157 (loaded from Supabase)
App.tsx:288 💾 Saved odds to Supabase for market market_1763236872127_yt2jrl1d6
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236965327
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: admin
App.tsx:1358 🎯 About to render main content
approvedMarketsService.ts:222 🔍 NEW MARKET CONTRACT DEBUG: null
approvedMarketsService.ts:223 🔍 NEW MARKET TYPE: object
approvedMarketsService.ts:224 🔍 NEW MARKET ID: market_1758612204970_xgolhnr9c
approvedMarketsService.ts:222 🔍 NEW MARKET CONTRACT DEBUG: null
approvedMarketsService.ts:223 🔍 NEW MARKET TYPE: object
approvedMarketsService.ts:224 🔍 NEW MARKET ID: market_1758612204970_xgolhnr9c
@supabase_supabase-js.js?v=304d513d:4300  GET https://fiopwubhukuxmjgujtxk.supabase.co/rest/v1/resolution_scores?select=*&market_id=eq.market_1763234009325_85xmsqer4 404 (Not Found)
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4300
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4321
fulfilled @ @supabase_supabase-js.js?v=304d513d:4273
Promise.then
step @ @supabase_supabase-js.js?v=304d513d:4286
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4288
__awaiter6 @ @supabase_supabase-js.js?v=304d513d:4270
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4311
then @ @supabase_supabase-js.js?v=304d513d:90Understand this error
approvedMarketsService.ts:222 🔍 NEW MARKET CONTRACT DEBUG: null
approvedMarketsService.ts:223 🔍 NEW MARKET TYPE: object
approvedMarketsService.ts:224 🔍 NEW MARKET ID: market_1758612204970_xgolhnr9c
@supabase_supabase-js.js?v=304d513d:4300  GET https://fiopwubhukuxmjgujtxk.supabase.co/rest/v1/resolution_scores?select=*&market_id=eq.market_1763233613830_1gc5l66uj 404 (Not Found)
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4300
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4321
fulfilled @ @supabase_supabase-js.js?v=304d513d:4273
Promise.then
step @ @supabase_supabase-js.js?v=304d513d:4286
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4288
__awaiter6 @ @supabase_supabase-js.js?v=304d513d:4270
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4311
then @ @supabase_supabase-js.js?v=304d513d:90Understand this error
@supabase_supabase-js.js?v=304d513d:4300  GET https://fiopwubhukuxmjgujtxk.supabase.co/rest/v1/resolution_scores?select=*&market_id=eq.market_1763203247188_8yn0l7r2z 404 (Not Found)
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4300
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4321
fulfilled @ @supabase_supabase-js.js?v=304d513d:4273
Promise.then
step @ @supabase_supabase-js.js?v=304d513d:4286
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4288
__awaiter6 @ @supabase_supabase-js.js?v=304d513d:4270
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4311
then @ @supabase_supabase-js.js?v=304d513d:90Understand this error
@supabase_supabase-js.js?v=304d513d:4300  GET https://fiopwubhukuxmjgujtxk.supabase.co/rest/v1/resolution_scores?select=*&market_id=eq.market_1763191574999_vm1w3ixua 404 (Not Found)
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4300
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4321
fulfilled @ @supabase_supabase-js.js?v=304d513d:4273
Promise.then
step @ @supabase_supabase-js.js?v=304d513d:4286
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4288
__awaiter6 @ @supabase_supabase-js.js?v=304d513d:4270
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4311
then @ @supabase_supabase-js.js?v=304d513d:90Understand this error
@supabase_supabase-js.js?v=304d513d:4300  GET https://fiopwubhukuxmjgujtxk.supabase.co/rest/v1/resolution_scores?select=*&market_id=eq.market_1763056480333_0amimmedk 404 (Not Found)
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4300
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4321
fulfilled @ @supabase_supabase-js.js?v=304d513d:4273
Promise.then
step @ @supabase_supabase-js.js?v=304d513d:4286
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4288
__awaiter6 @ @supabase_supabase-js.js?v=304d513d:4270
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4311
then @ @supabase_supabase-js.js?v=304d513d:90Understand this error
marketStatusService.ts:77 🔍 Checking 2 markets for status updates...
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236972744
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: admin
App.tsx:1358 🎯 About to render main content
inpage.js:1 MetaMask - RPC Error: RPC endpoint returned HTTP client error. {code: -32080, message: 'RPC endpoint returned HTTP client error.', data: {…}, stack: '{\n  "code": -32080,\n  "message": "RPC endpoint ret…hfbeogaeaoehlefnkodbefgpgknn/common-2.js:3:145796'}
(anonymous) @ inpage.js:1
(anonymous) @ inpage.js:1
p @ inpage.js:1
f @ inpage.js:1
await in f
l @ inpage.js:1
handle @ inpage.js:1
_rpcRequest @ inpage.js:1
(anonymous) @ inpage.js:1
request @ inpage.js:1
request @ evmAsk.js:5
(anonymous) @ ethers.js?v=2c34c6c3:21767
_send @ ethers.js?v=2c34c6c3:21790
(anonymous) @ ethers.js?v=2c34c6c3:19464
(anonymous) @ ethers.js?v=2c34c6c3:19493
setTimeout
scheduleDrain_fn @ ethers.js?v=2c34c6c3:19443
send @ ethers.js?v=2c34c6c3:19375
send @ ethers.js?v=2c34c6c3:21785
await in send
(anonymous) @ ethers.js?v=2c34c6c3:19034
_detectNetwork @ ethers.js?v=2c34c6c3:19041
getNetwork @ ethers.js?v=2c34c6c3:17544
getLogs @ ethers.js?v=2c34c6c3:17701
queryFilter @ ethers.js?v=2c34c6c3:15339
await in queryFilter
getFeeHistory @ treasuryService.ts:203
await in getFeeHistory
loadAllTreasuryData @ UnifiedTreasuryDashboard.tsx:83
await in loadAllTreasuryData
(anonymous) @ UnifiedTreasuryDashboard.tsx:59
commitHookEffectListMount @ chunk-7WYZBWXT.js?v=30959415:16963
commitPassiveMountOnFiber @ chunk-7WYZBWXT.js?v=30959415:18206
commitPassiveMountEffects_complete @ chunk-7WYZBWXT.js?v=30959415:18179
commitPassiveMountEffects_begin @ chunk-7WYZBWXT.js?v=30959415:18169
commitPassiveMountEffects @ chunk-7WYZBWXT.js?v=30959415:18159
flushPassiveEffectsImpl @ chunk-7WYZBWXT.js?v=30959415:19543
flushPassiveEffects @ chunk-7WYZBWXT.js?v=30959415:19500
commitRootImpl @ chunk-7WYZBWXT.js?v=30959415:19469
commitRoot @ chunk-7WYZBWXT.js?v=30959415:19330
performSyncWorkOnRoot @ chunk-7WYZBWXT.js?v=30959415:18948
flushSyncCallbacks @ chunk-7WYZBWXT.js?v=30959415:9166
(anonymous) @ chunk-7WYZBWXT.js?v=30959415:18677Understand this warning
treasuryService.ts:219 Failed to get fee history: Error: could not coalesce error (error={ "code": -32080, "data": { "cause": null, "httpStatus": 400 }, "message": "RPC endpoint returned HTTP client error." }, payload={ "id": 182, "jsonrpc": "2.0", "method": "eth_getLogs", "params": [ { "address": "0x54644fd3576720d16ff48ea7e0545cb1d772d876", "fromBlock": "0x457e75b", "toBlock": "latest", "topics": [ "0x17154a87eb05ffe86bee545a571026f12ee62c1ac1e46fd00770c5b1d78ac4c0" ] } ] }, code=UNKNOWN_ERROR, version=6.15.0)
    at makeError (ethers.js?v=2c34c6c3:337:15)
    at _BrowserProvider.getRpcError (ethers.js?v=2c34c6c3:19348:12)
    at _BrowserProvider.getRpcError (ethers.js?v=2c34c6c3:21809:18)
    at ethers.js?v=2c34c6c3:19482:27
getFeeHistory @ treasuryService.ts:219
await in getFeeHistory
loadAllTreasuryData @ UnifiedTreasuryDashboard.tsx:83
await in loadAllTreasuryData
(anonymous) @ UnifiedTreasuryDashboard.tsx:59
commitHookEffectListMount @ chunk-7WYZBWXT.js?v=30959415:16963
commitPassiveMountOnFiber @ chunk-7WYZBWXT.js?v=30959415:18206
commitPassiveMountEffects_complete @ chunk-7WYZBWXT.js?v=30959415:18179
commitPassiveMountEffects_begin @ chunk-7WYZBWXT.js?v=30959415:18169
commitPassiveMountEffects @ chunk-7WYZBWXT.js?v=30959415:18159
flushPassiveEffectsImpl @ chunk-7WYZBWXT.js?v=30959415:19543
flushPassiveEffects @ chunk-7WYZBWXT.js?v=30959415:19500
commitRootImpl @ chunk-7WYZBWXT.js?v=30959415:19469
commitRoot @ chunk-7WYZBWXT.js?v=30959415:19330
performSyncWorkOnRoot @ chunk-7WYZBWXT.js?v=30959415:18948
flushSyncCallbacks @ chunk-7WYZBWXT.js?v=30959415:9166
(anonymous) @ chunk-7WYZBWXT.js?v=30959415:18677Understand this error
treasuryService.ts:219 Failed to get fee history: Error: could not coalesce error (error={ "code": -32080, "data": { "cause": null, "httpStatus": 400 }, "message": "RPC endpoint returned HTTP client error." }, payload={ "id": 182, "jsonrpc": "2.0", "method": "eth_getLogs", "params": [ { "address": "0x54644fd3576720d16ff48ea7e0545cb1d772d876", "fromBlock": "0x457e75b", "toBlock": "latest", "topics": [ "0x17154a87eb05ffe86bee545a571026f12ee62c1ac1e46fd00770c5b1d78ac4c0" ] } ] }, code=UNKNOWN_ERROR, version=6.15.0)
    at makeError (ethers.js?v=2c34c6c3:337:15)
    at _BrowserProvider.getRpcError (ethers.js?v=2c34c6c3:19348:12)
    at _BrowserProvider.getRpcError (ethers.js?v=2c34c6c3:21809:18)
    at ethers.js?v=2c34c6c3:19482:27
getFeeHistory @ treasuryService.ts:219
await in getFeeHistory
getTotalFeesCollected @ treasuryService.ts:228
getTreasuryAnalytics @ treasuryService.ts:264
loadAllTreasuryData @ UnifiedTreasuryDashboard.tsx:84
await in loadAllTreasuryData
(anonymous) @ UnifiedTreasuryDashboard.tsx:59
commitHookEffectListMount @ chunk-7WYZBWXT.js?v=30959415:16963
commitPassiveMountOnFiber @ chunk-7WYZBWXT.js?v=30959415:18206
commitPassiveMountEffects_complete @ chunk-7WYZBWXT.js?v=30959415:18179
commitPassiveMountEffects_begin @ chunk-7WYZBWXT.js?v=30959415:18169
commitPassiveMountEffects @ chunk-7WYZBWXT.js?v=30959415:18159
flushPassiveEffectsImpl @ chunk-7WYZBWXT.js?v=30959415:19543
flushPassiveEffects @ chunk-7WYZBWXT.js?v=30959415:19500
commitRootImpl @ chunk-7WYZBWXT.js?v=30959415:19469
commitRoot @ chunk-7WYZBWXT.js?v=30959415:19330
performSyncWorkOnRoot @ chunk-7WYZBWXT.js?v=30959415:18948
flushSyncCallbacks @ chunk-7WYZBWXT.js?v=30959415:9166
(anonymous) @ chunk-7WYZBWXT.js?v=30959415:18677Understand this error
inpage.js:1  HEAD https://fiopwubhukuxmjgujtxk.supabase.co/rest/v1/bets?select=* 404 (Not Found)
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4300
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4321
fulfilled @ @supabase_supabase-js.js?v=304d513d:4273
Promise.then
step @ @supabase_supabase-js.js?v=304d513d:4286
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4288
__awaiter6 @ @supabase_supabase-js.js?v=304d513d:4270
(anonymous) @ @supabase_supabase-js.js?v=304d513d:4311
then @ @supabase_supabase-js.js?v=304d513d:90
setTimeout
(anonymous) @ inpage.js:1
write @ inpage.js:1
j @ inpage.js:1
(anonymous) @ inpage.js:1
R.write @ inpage.js:1
d @ inpage.js:1
a.emit @ inpage.js:10
A @ inpage.js:1
j @ inpage.js:1
R.push @ inpage.js:1
_write @ inpage.js:1
j @ inpage.js:1
(anonymous) @ inpage.js:1
R.write @ inpage.js:1
d @ inpage.js:1
a.emit @ inpage.js:10
A @ inpage.js:1
j @ inpage.js:1
R.push @ inpage.js:1
_onData @ inpage.js:1
_onMessage @ inpage.js:1
postMessage
_postMessage @ contentscript.js:1
_write @ contentscript.js:1
x @ contentscript.js:1
(anonymous) @ contentscript.js:1
R.write @ contentscript.js:1
d @ contentscript.js:1
a.emit @ contentscript.js:10
I @ contentscript.js:1
x @ contentscript.js:1
R.push @ contentscript.js:1
_write @ contentscript.js:1
x @ contentscript.js:1
(anonymous) @ contentscript.js:1
R.write @ contentscript.js:1
d @ contentscript.js:1
a.emit @ contentscript.js:10
I @ contentscript.js:1
x @ contentscript.js:1
R.push @ contentscript.js:1
_write @ contentscript.js:1
x @ contentscript.js:1
(anonymous) @ contentscript.js:1
R.write @ contentscript.js:1
f @ contentscript.js:12
a.emit @ contentscript.js:10
J @ contentscript.js:12
K @ contentscript.js:12
q.push @ contentscript.js:12
(anonymous) @ contentscript.js:10Understand this error
App.tsx:1126 🔄 EXECUTING refreshMarketOddsWithAddress (attempt 4)...
App.tsx:188 🔄 Refreshing market odds for market_1763236872127_yt2jrl1d6 using direct BSC contract address: 0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1
App.tsx:228 📊 Fetched data from blockchain: {yesOdds: '1.976', noOdds: '2.025', yesProb: '50.0%', noProb: '50.0%', yesShares: '1025.00', …}
App.tsx:241 🔄 State update for market market_1763236872127_yt2jrl1d6: {found: true, oldYesOdds: 1.975609756097561, newYesOdds: 1.975609756097561, oldNoOdds: 2.025, newNoOdds: 2.025, …}
App.tsx:270 ✅ Market odds updated for market_1763236872127_yt2jrl1d6 using direct address: {yesOdds: '1.976', noOdds: '2.025', yesProb: '50.0%', noProb: '50.0%'}
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236979310
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: admin
App.tsx:1358 🎯 About to render main content
App.tsx:446 🔥 Markets changed - count: 157 (loaded from Supabase)
App.tsx:288 💾 Saved odds to Supabase for market market_1763236872127_yt2jrl1d6
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236982869
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: markets
App.tsx:1358 🎯 About to render main content
App.tsx:1363 🏪 Rendering unified markets with 157 markets
App.tsx:437 🔥 State changed - isLoading: false showOnboarding: false currentTab: markets
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763236987940
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: market-detail
App.tsx:1358 🎯 About to render main content
walletService.ts:125 🔄 Attempting to get balance (attempt 1/3)...
App.tsx:437 🔥 State changed - isLoading: false showOnboarding: false currentTab: market-detail
walletService.ts:127 ✅ Balance retrieved successfully
MarketPage.tsx:266 Failed to load BSC bets, falling back to localStorage: Error: missing response for request (value=[ { "error": { "code": -32005, "message": "method eth_getLogs in batch triggered rate limit" }, "id": null, "jsonrpc": "2.0" } ], info={ "payload": { "id": 4, "jsonrpc": "2.0", "method": "eth_getLogs", "params": [ { "address": "0x86922fd2556f6a3043019c904fedcd9c0da53bb1", "fromBlock": "0x4593513", "toBlock": "latest", "topics": [ "0x6ce1f870748af127e987dbf88043a12a0171c5ac302d65c3c79222c51201ca9e" ] } ] } }, code=BAD_DATA, version=6.15.0)
    at makeError (ethers.js?v=2c34c6c3:337:15)
    at ethers.js?v=2c34c6c3:19473:29
loadMarketActivity @ MarketPage.tsx:266
await in loadMarketActivity
(anonymous) @ MarketPage.tsx:308
commitHookEffectListMount @ chunk-7WYZBWXT.js?v=30959415:16963
commitPassiveMountOnFiber @ chunk-7WYZBWXT.js?v=30959415:18206
commitPassiveMountEffects_complete @ chunk-7WYZBWXT.js?v=30959415:18179
commitPassiveMountEffects_begin @ chunk-7WYZBWXT.js?v=30959415:18169
commitPassiveMountEffects @ chunk-7WYZBWXT.js?v=30959415:18159
flushPassiveEffectsImpl @ chunk-7WYZBWXT.js?v=30959415:19543
flushPassiveEffects @ chunk-7WYZBWXT.js?v=30959415:19500
commitRootImpl @ chunk-7WYZBWXT.js?v=30959415:19469
commitRoot @ chunk-7WYZBWXT.js?v=30959415:19330
performSyncWorkOnRoot @ chunk-7WYZBWXT.js?v=30959415:18948
flushSyncCallbacks @ chunk-7WYZBWXT.js?v=30959415:9166
(anonymous) @ chunk-7WYZBWXT.js?v=30959415:18677Understand this error
MarketPage.tsx:276 📊 Total bets loaded: 1
marketStatusService.ts:77 🔍 Checking 2 markets for status updates...
walletService.ts:125 🔄 Attempting to get balance (attempt 1/3)...
walletService.ts:127 ✅ Balance retrieved successfully
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763237023157
App.tsx:1337 🎯 renderCurrentPage called, isLoading: false currentTab: markets
App.tsx:1358 🎯 About to render main content
App.tsx:1363 🏪 Rendering unified markets with 157 markets
App.tsx:437 🔥 State changed - isLoading: false showOnboarding: false currentTab: markets
marketStatusService.ts:77 🔍 Checking 2 markets for status updates...
aiResolutionScheduler.ts:84 📊 Loading active markets for scheduling...
aiResolutionScheduler.ts:102 📋 Found 2 active markets
aiResolutionScheduler.ts:146 ⏰ Scheduling market market_1763236872127_yt2jrl1d6 for resolution in 0 minutes
aiResolutionScheduler.ts:147    Expires at: 15/11/2025 20:04:00
aiResolutionScheduler.ts:162 ✅ Market market_1763236872127_yt2jrl1d6 scheduled successfully
aiResolutionScheduler.ts:170 🤖 ============================================
aiResolutionScheduler.ts:171 🤖 TRIGGERING AI RESOLUTION
aiResolutionScheduler.ts:172 📋 Market: la belgique est plus petite que la france
aiResolutionScheduler.ts:173 ⏰ Expired at: 15/11/2025 20:04:00
aiResolutionScheduler.ts:174 🤖 ============================================
perplexityResolutionService.ts:35 🤖 Calling Perplexity API for market resolution...
perplexityResolutionService.ts:36 📋 Question: la belgique est plus petite que la france
perplexityResolutionService.ts:77 ✅ Perplexity API response: {id: '126681e9-5daf-4f68-8620-c28a553e30f1', model: 'sonar', created: 1763237045, usage: {…}, citations: Array(6), …}
perplexityResolutionService.ts:164 ✅ Extracted confidence: 99%
perplexityResolutionService.ts:83 📊 Parsed resolution: {outcome: 'yes', reasoning: 'Belgium has a total area of 30,528 km² with a popu…ler than France in both territory and population.', confidence: 99, needsReview: false}
aiResolutionScheduler.ts:182 📊 Perplexity Resolution Result: {outcome: 'yes', reasoning: 'Belgium has a total area of 30,528 km² with a popu…ler than France in both territory and population.', confidence: 99, needsReview: false}
aiResolutionScheduler.ts:274 ✅ Resolution saved to database
aiResolutionScheduler.ts:330 💰 Triggering payout...
aiResolutionScheduler.ts:331    Contract: 0x86922FD2556F6A3043019c904FEDcd9C0Da53BB1
aiResolutionScheduler.ts:332    Outcome: yes
aiResolutionScheduler.ts:343 🔐 Calling resolveMarketWithAI on blockchain...
resolutionService.ts:561 🤖 Starting automated AI resolution for market market_1763236872127_yt2jrl1d6: yes (80% confidence)
resolutionService.ts:677 ❌ Error in automated AI resolution: Error: Market market_1763236872127_yt2jrl1d6 has status 'resolved' - can only resolve open/expired markets
    at ResolutionService.resolveMarketWithAI (resolutionService.ts:587:17)
    at async AIResolutionScheduler.triggerPayout (aiResolutionScheduler.ts:344:22)
    at async AIResolutionScheduler.triggerMarketResolution (aiResolutionScheduler.ts:234:7)
    at async aiResolutionScheduler.ts:151:7
resolveMarketWithAI @ resolutionService.ts:677
await in resolveMarketWithAI
triggerPayout @ aiResolutionScheduler.ts:344
triggerMarketResolution @ aiResolutionScheduler.ts:234
await in triggerMarketResolution
(anonymous) @ aiResolutionScheduler.ts:151
setTimeout
scheduleMarketResolution @ aiResolutionScheduler.ts:150
loadAndScheduleMarkets @ aiResolutionScheduler.ts:120
await in loadAndScheduleMarkets
(anonymous) @ aiResolutionScheduler.ts:45Understand this error
aiResolutionScheduler.ts:351 Error triggering payout: Error: Market market_1763236872127_yt2jrl1d6 has status 'resolved' - can only resolve open/expired markets
    at ResolutionService.resolveMarketWithAI (resolutionService.ts:587:17)
    at async AIResolutionScheduler.triggerPayout (aiResolutionScheduler.ts:344:22)
    at async AIResolutionScheduler.triggerMarketResolution (aiResolutionScheduler.ts:234:7)
    at async aiResolutionScheduler.ts:151:7
triggerPayout @ aiResolutionScheduler.ts:351
await in triggerPayout
triggerMarketResolution @ aiResolutionScheduler.ts:234
await in triggerMarketResolution
(anonymous) @ aiResolutionScheduler.ts:151
setTimeout
scheduleMarketResolution @ aiResolutionScheduler.ts:150
loadAndScheduleMarkets @ aiResolutionScheduler.ts:120
await in loadAndScheduleMarkets
(anonymous) @ aiResolutionScheduler.ts:45Understand this error
aiResolutionScheduler.ts:240 ❌ Error in triggerMarketResolution: Error: Market market_1763236872127_yt2jrl1d6 has status 'resolved' - can only resolve open/expired markets
    at ResolutionService.resolveMarketWithAI (resolutionService.ts:587:17)
    at async AIResolutionScheduler.triggerPayout (aiResolutionScheduler.ts:344:22)
    at async AIResolutionScheduler.triggerMarketResolution (aiResolutionScheduler.ts:234:7)
    at async aiResolutionScheduler.ts:151:7
triggerMarketResolution @ aiResolutionScheduler.ts:240
await in triggerMarketResolution
(anonymous) @ aiResolutionScheduler.ts:151
setTimeout
scheduleMarketResolution @ aiResolutionScheduler.ts:150
loadAndScheduleMarkets @ aiResolutionScheduler.ts:120
await in loadAndScheduleMarkets
(anonymous) @ aiResolutionScheduler.ts:45Understand this error