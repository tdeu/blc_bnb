sonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
CreateMarket.tsx:158 ✅ Image uploaded successfully: https://fiopwubhukuxmjgujtxk.supabase.co/storage/v1/object/public/market-assets/market-images/market-1763304683624-l2kya.jpg
CreateMarket.tsx:176 📤 Creating market with data: {claim: 'polymarket et-il une platform de prediction ?', imageUrl: 'https://fiopwubhukuxmjgujtxk.supabase.co/storage/v…sets/market-images/market-1763304683624-l2kya.jpg', hasImage: true}
App.tsx:1228 🔗 Attempting to create market on BSC... {isWalletConnected: true, isFactoryConfigured: true, marketId: 'market_1763304685689_zbmeggou7'}
App.tsx:1237 ⏳ Starting blockchain deployment for market: market_1763304685689_zbmeggou7
factoryService.ts:73 🏭 Creating market on BSC factory: {question: 'polymarket et-il une platform de prediction ?', endTime: Sun Nov 16 2025 14:59:00 GMT+0000 (heure moyenne de Greenwich), category: 'Entertainment', allowEarlyResolution: false}
factoryService.ts:99 📝 Calling factory.createMarket with: {question: 'polymarket et-il une platform de prediction ?', endTime: 1763305140, collateral: '0.001 BNB'}
1265ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
marketStatusService.ts:77 🔍 Checking 3 markets for status updates...
22ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
factoryService.ts:116 ⏳ Transaction sent: 0x6d26b63ee27a8802e07cf3ca8372af08575d3bede4ba7e18f3ffc40fde933616
438ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
factoryService.ts:122 ✅ Transaction confirmed: ContractTransactionReceipt {provider: _BrowserProvider, to: '0x8f75f2408478CB92D7cA2f10cc3F76d0c01CBb76', from: '0x17B40492e3d7A2A2bA2FE0c09322CF9e5563Cb0b', contractAddress: null, hash: '0x6d26b63ee27a8802e07cf3ca8372af08575d3bede4ba7e18f3ffc40fde933616', …}
factoryService.ts:147 🎉 Market created:
factoryService.ts:148    ID: 0x9fa082b7530a1cd8933252d6a677beac752c4fee18f235ec9da30956a3e3df57
factoryService.ts:149    Address: 0x6dd70682fbf909413a9CAFE8161a23d4f27d46e2
App.tsx:1249 ✅ Market created on BSC: 0x6dd70682fbf909413a9CAFE8161a23d4f27d46e2
pendingMarketsService.ts:96 📝 Market submitted to Supabase for approval: polymarket et-il une platform de prediction ?
App.tsx:1293 📝 Market submitted to Supabase for admin approval with contract address 0x6dd70682fbf909413a9CAFE8161a23d4f27d46e2
App.tsx:1334 🔥 About to call recordMarketCreation with newMarket: {id: 'market_1763304685689_zbmeggou7', claim: 'polymarket et-il une platform de prediction ?', category: 'Entertainment', source: '', description: 'polymarket et-il une platform de prediction ?', …}
App.tsx:1335 🔥 newMarket.imageUrl specifically: https://fiopwubhukuxmjgujtxk.supabase.co/storage/v1/object/public/market-assets/market-images/market-1763304683624-l2kya.jpg
userDataService.ts:279 🚨 RECORD MARKET CREATION CALLED! {walletAddress: '0x17b40492e3d7a2a2ba2fe0c09322cf9e5563cb0b', marketId: 'market_1763304685689_zbmeggou7', claim: 'polymarket et-il une platform de prediction ?', transactionHash: 'pending-1763304725103', fullMarketData: {…}, …}
userDataService.ts:302 🔍 DEBUG: Recording market with imageUrl: https://fiopwubhukuxmjgujtxk.supabase.co/storage/v1/object/public/market-assets/market-images/market-1763304683624-l2kya.jpg
userDataService.ts:303 ✅ Market creation recorded locally: {id: 'market_1763304685689_zbmeggou7', claim: 'polymarket et-il une platform de prediction ?', createdAt: Sun Nov 16 2025 14:52:05 GMT+0000 (heure moyenne de Greenwich), transactionHash: 'pending-1763304725103', submitterAddress: '0x17b40492e3d7a2a2ba2fe0c09322cf9e5563cb0b', …}
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763304725110
App.tsx:1354 🎯 renderCurrentPage called, isLoading: false currentTab: markets
App.tsx:1375 🎯 About to render main content
App.tsx:1380 🏪 Rendering unified markets with 176 markets
App.tsx:444 🔥 State changed - isLoading: false showOnboarding: false currentTab: markets
275ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763304729086
App.tsx:1354 🎯 renderCurrentPage called, isLoading: false currentTab: admin
App.tsx:1375 🎯 About to render main content
App.tsx:444 🔥 State changed - isLoading: false showOnboarding: false currentTab: admin
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763304729122
App.tsx:1354 🎯 renderCurrentPage called, isLoading: false currentTab: admin
App.tsx:1375 🎯 About to render main content
100ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
approvedMarketsService.ts:226 🔍 NEW MARKET CONTRACT DEBUG: null
approvedMarketsService.ts:227 🔍 NEW MARKET TYPE: object
approvedMarketsService.ts:228 🔍 NEW MARKET ID: market_1758612204970_xgolhnr9c
19ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763304731383
App.tsx:1354 🎯 renderCurrentPage called, isLoading: false currentTab: admin
App.tsx:1375 🎯 About to render main content
10ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
approvedMarketsService.ts:226 🔍 NEW MARKET CONTRACT DEBUG: null
approvedMarketsService.ts:227 🔍 NEW MARKET TYPE: object
approvedMarketsService.ts:228 🔍 NEW MARKET ID: market_1758612204970_xgolhnr9c
6ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
MarketApproval.tsx:131 🏛️ Admin dashboard rendering market: {id: 'market_1763304685689_zbmeggou7', question: 'polymarket et-il une platform de prediction ?', hasImageUrl: true, imageUrl: 'https://fiopwubhukuxmjgujtxk.supabase.co/storage/v…sets/market-images/market-1763304683624-l2kya.jpg', imageUrlType: 'string', …}
33ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
approvedMarketsService.ts:226 🔍 NEW MARKET CONTRACT DEBUG: null
approvedMarketsService.ts:227 🔍 NEW MARKET TYPE: object
approvedMarketsService.ts:228 🔍 NEW MARKET ID: market_1758612204970_xgolhnr9c
83ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
MarketApproval.tsx:177 ✅ Successfully loaded market image: https://fiopwubhukuxmjgujtxk.supabase.co/storage/v1/object/public/market-assets/market-images/market-1763304683624-l2kya.jpg
36ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
adminService.ts:138 Admin 0x17b40492e3d7a2a2ba2fe0c09322cf9e5563cb0b approving market market_1763304685689_zbmeggou7
MarketApproval.tsx:131 🏛️ Admin dashboard rendering market: {id: 'market_1763304685689_zbmeggou7', question: 'polymarket et-il une platform de prediction ?', hasImageUrl: true, imageUrl: 'https://fiopwubhukuxmjgujtxk.supabase.co/storage/v…sets/market-images/market-1763304683624-l2kya.jpg', imageUrlType: 'string', …}
MarketApproval.tsx:177 ✅ Successfully loaded market image: https://fiopwubhukuxmjgujtxk.supabase.co/storage/v1/object/public/market-assets/market-images/market-1763304683624-l2kya.jpg
119ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
pendingMarketsService.ts:202 ✅ Market approved in Supabase: polymarket et-il une platform de prediction ?
7ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
approvedMarketsService.ts:52 ✅ Market stored/updated in Supabase: polymarket et-il une platform de prediction ?
App.tsx:807 🎉 Market approved and added to homepage: polymarket et-il une platform de prediction ?
adminService.ts:374 🔗 Activating market market_1763304685689_zbmeggou7 on-chain...
adminService.ts:394 📝 Calling contract.approveMarket() for 0x6dd70682fbf909413a9CAFE8161a23d4f27d46e2
adminService.ts:410 🔗 Trying RPC: https://bsc-testnet-rpc.publicnode.com
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763304735776
App.tsx:1354 🎯 renderCurrentPage called, isLoading: false currentTab: admin
App.tsx:1375 🎯 About to render main content
MarketApproval.tsx:131 🏛️ Admin dashboard rendering market: {id: 'market_1763304685689_zbmeggou7', question: 'polymarket et-il une platform de prediction ?', hasImageUrl: true, imageUrl: 'https://fiopwubhukuxmjgujtxk.supabase.co/storage/v…sets/market-images/market-1763304683624-l2kya.jpg', imageUrlType: 'string', …}
MarketApproval.tsx:177 ✅ Successfully loaded market image: https://fiopwubhukuxmjgujtxk.supabase.co/storage/v1/object/public/market-assets/market-images/market-1763304683624-l2kya.jpg
App.tsx:453 🔥 Markets changed - count: 177 (loaded from Supabase)
112ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
adminService.ts:415 ✅ Connected to RPC: https://bsc-testnet-rpc.publicnode.com
adminService.ts:431 🔐 Using signer address: 0x17B40492e3d7A2A2bA2FE0c09322CF9e5563Cb0b
2ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
adminService.ts:444 📊 Current market status: 0 (type: bigint)
adminService.ts:448 ✅ Market is Submited, calling approveMarket()...
121ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
adminService.ts:450 📤 Transaction sent: 0x483e1aaa01cee6f390ec20a7073a0f61ec86c069a8429176168e13e89ef1989d
419ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
adminService.ts:453 ✅ Market market_1763304685689_zbmeggou7 activated on-chain! Gas used: 51095
35ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
adminService.ts:457 🎉 New market status: 1 (should be 1 for Open)
adminService.ts:464 ✅ Market market_1763304685689_zbmeggou7 successfully activated on BSC
66ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
marketStatusService.ts:77 🔍 Checking 4 markets for status updates...
205ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763304747219
App.tsx:1354 🎯 renderCurrentPage called, isLoading: false currentTab: markets
App.tsx:1375 🎯 About to render main content
App.tsx:1380 🏪 Rendering unified markets with 177 markets
App.tsx:444 🔥 State changed - isLoading: false showOnboarding: false currentTab: markets
412ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
BettingMarkets.tsx:274 🎯 BettingMarkets: handleOpenBetDialog called with market: {id: 'market_1763304685689_zbmeggou7', claim: 'polymarket et-il une platform '}
chunk-7WYZBWXT.js?v=ae605cb5:521 Warning: Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()?

Check the render method of `Primitive.div.SlotClone`.
    at AlertDialogOverlay (http://localhost:3000/src/components/ui/alert-dialog.tsx:59:31)
    at http://localhost:3000/node_modules/.vite/deps/chunk-X5NZ3XE2.js?v=ae605cb5:79:13
    at http://localhost:3000/node_modules/.vite/deps/chunk-X5NZ3XE2.js?v=ae605cb5:56:13
    at http://localhost:3000/node_modules/.vite/deps/chunk-5VORCL3H.js?v=ae605cb5:43:13
    at http://localhost:3000/node_modules/.vite/deps/chunk-P3ET5POO.js?v=ae605cb5:465:22
    at Presence (http://localhost:3000/node_modules/.vite/deps/chunk-57TCVHD5.js?v=ae605cb5:24:11)
    at Provider (http://localhost:3000/node_modules/.vite/deps/chunk-3RXG37ZK.js?v=ae605cb5:38:15)
    at DialogPortal (http://localhost:3000/node_modules/.vite/deps/chunk-CFPQEZUR.js?v=ae605cb5:108:11)
    at AlertDialogPortal (http://localhost:3000/node_modules/.vite/deps/@radix-ui_react-alert-dialog@1__1__6.js?v=ae605cb5:66:11)
    at AlertDialogPortal (http://localhost:3000/src/components/ui/alert-dialog.tsx:48:33)
    at AlertDialogContent (http://localhost:3000/src/components/ui/alert-dialog.tsx:71:31)
    at Provider (http://localhost:3000/node_modules/.vite/deps/chunk-3RXG37ZK.js?v=ae605cb5:38:15)
    at Dialog (http://localhost:3000/node_modules/.vite/deps/chunk-CFPQEZUR.js?v=ae605cb5:48:5)
    at AlertDialog (http://localhost:3000/node_modules/.vite/deps/@radix-ui_react-alert-dialog@1__1__6.js?v=ae605cb5:50:11)
    at AlertDialog (http://localhost:3000/src/components/ui/alert-dialog.tsx:26:27)
    at div
    at BettingMarkets (http://localhost:3000/src/components/betting/BettingMarkets.tsx?t=1763303817463:36:42)
    at main
    at div
    at UserProvider (http://localhost:3000/src/contexts/UserContext.tsx:26:32)
    at LanguageProvider (http://localhost:3000/src/components/shared/LanguageContext.tsx:368:36)
    at App (http://localhost:3000/src/App.tsx?t=1763303817463:119:41)
printWarning @ chunk-7WYZBWXT.js?v=ae605cb5:521
error @ chunk-7WYZBWXT.js?v=ae605cb5:505
validateFunctionComponentInDev @ chunk-7WYZBWXT.js?v=ae605cb5:15061
mountIndeterminateComponent @ chunk-7WYZBWXT.js?v=ae605cb5:15036
beginWork @ chunk-7WYZBWXT.js?v=ae605cb5:15962
beginWork$1 @ chunk-7WYZBWXT.js?v=ae605cb5:19806
performUnitOfWork @ chunk-7WYZBWXT.js?v=ae605cb5:19251
workLoopSync @ chunk-7WYZBWXT.js?v=ae605cb5:19190
renderRootSync @ chunk-7WYZBWXT.js?v=ae605cb5:19169
performSyncWorkOnRoot @ chunk-7WYZBWXT.js?v=ae605cb5:18927
flushSyncCallbacks @ chunk-7WYZBWXT.js?v=ae605cb5:9166
(anonymous) @ chunk-7WYZBWXT.js?v=ae605cb5:18677Understand this error
@radix-ui_react-alert-dialog@1__1__6.js?v=ae605cb5:170 `AlertDialogContent` requires a description for the component to be accessible for screen reader users.

You can add a description to the `AlertDialogContent` by passing a `AlertDialogDescription` component as a child, which also benefits sighted users by adding visible context to the dialog.

Alternatively, you can use your own component as a description by assigning it an `id` and passing the same value to the `aria-describedby` prop in `AlertDialogContent`. If the description is confusing or duplicative for sighted users, you can use the `@radix-ui/react-visually-hidden` primitive as a wrapper around your description component.

For more information, see https://radix-ui.com/primitives/docs/components/alert-dialog
(anonymous) @ @radix-ui_react-alert-dialog@1__1__6.js?v=ae605cb5:170
commitHookEffectListMount @ chunk-7WYZBWXT.js?v=ae605cb5:16963
commitPassiveMountOnFiber @ chunk-7WYZBWXT.js?v=ae605cb5:18206
commitPassiveMountEffects_complete @ chunk-7WYZBWXT.js?v=ae605cb5:18179
commitPassiveMountEffects_begin @ chunk-7WYZBWXT.js?v=ae605cb5:18169
commitPassiveMountEffects @ chunk-7WYZBWXT.js?v=ae605cb5:18159
flushPassiveEffectsImpl @ chunk-7WYZBWXT.js?v=ae605cb5:19543
flushPassiveEffects @ chunk-7WYZBWXT.js?v=ae605cb5:19500
commitRootImpl @ chunk-7WYZBWXT.js?v=ae605cb5:19469
commitRoot @ chunk-7WYZBWXT.js?v=ae605cb5:19330
performSyncWorkOnRoot @ chunk-7WYZBWXT.js?v=ae605cb5:18948
flushSyncCallbacks @ chunk-7WYZBWXT.js?v=ae605cb5:9166
(anonymous) @ chunk-7WYZBWXT.js?v=ae605cb5:18677Understand this warning
chunk-CFPQEZUR.js?v=ae605cb5:336 Warning: Missing `Description` or `aria-describedby={undefined}` for {AlertDialogContent}.
(anonymous) @ chunk-CFPQEZUR.js?v=ae605cb5:336
commitHookEffectListMount @ chunk-7WYZBWXT.js?v=ae605cb5:16963
commitPassiveMountOnFiber @ chunk-7WYZBWXT.js?v=ae605cb5:18206
commitPassiveMountEffects_complete @ chunk-7WYZBWXT.js?v=ae605cb5:18179
commitPassiveMountEffects_begin @ chunk-7WYZBWXT.js?v=ae605cb5:18169
commitPassiveMountEffects @ chunk-7WYZBWXT.js?v=ae605cb5:18159
flushPassiveEffectsImpl @ chunk-7WYZBWXT.js?v=ae605cb5:19543
flushPassiveEffects @ chunk-7WYZBWXT.js?v=ae605cb5:19500
commitRootImpl @ chunk-7WYZBWXT.js?v=ae605cb5:19469
commitRoot @ chunk-7WYZBWXT.js?v=ae605cb5:19330
performSyncWorkOnRoot @ chunk-7WYZBWXT.js?v=ae605cb5:18948
flushSyncCallbacks @ chunk-7WYZBWXT.js?v=ae605cb5:9166
(anonymous) @ chunk-7WYZBWXT.js?v=ae605cb5:18677Understand this warning
478ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
BettingMarkets.tsx:306 🎯 BettingMarkets: handlePlaceBet called with selectedMarket: {id: 'market_1763304685689_zbmeggou7', claim: 'polymarket et-il une platform '}
74ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
App.tsx:937 🏪 Market found for trading: {id: 'market_1763304685689_zbmeggou7', claim: 'polymarket et-il une platform de prediction ?', contractAddress: '0x6dd70682fbf909413a9CAFE8161a23d4f27d46e2'}
userDataService.ts:208 ✅ Bet recorded locally: {id: 'market_1763304685689_zbmeggou7-1763304758854', marketId: 'market_1763304685689_zbmeggou7', marketClaim: 'polymarket et-il une platform de prediction ?', position: 'yes', amount: 43, …}
App.tsx:980 🔍 BSC connection status: {walletConnected: true}
App.tsx:986 ✅ Using existing market contract address: 0x6dd70682fbf909413a9CAFE8161a23d4f27d46e2
App.tsx:1008 📝 Proceeding with trade placement for market market_1763304685689_zbmeggou7. Contract: 0x6dd70682fbf909413a9CAFE8161a23d4f27d46e2
App.tsx:1011 🚀 Placing trade on BSC blockchain contract: 0x6dd70682fbf909413a9CAFE8161a23d4f27d46e2
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763304758856
App.tsx:1354 🎯 renderCurrentPage called, isLoading: false currentTab: markets
App.tsx:1375 🎯 About to render main content
App.tsx:1380 🏪 Rendering unified markets with 177 markets
App.tsx:457 🔥 UserProfile changed: exists
ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
App.tsx:1024 🎲 Placing bet on blockchain using contractService...
44ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
contractService.ts:519 💰 Cost for 43.0 shares: 21.726260401370533519 CAST
contractService.ts:520 🛡️ Max cost with 5% slippage: 22.812573421439060194 CAST
contractService.ts:529 📝 Approving 22.812573421439060194 CAST for market 0x6dd70682fbf909413a9CAFE8161a23d4f27d46e2...
824ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
contractService.ts:531 ⏳ Waiting for approval transaction: 0x02fffd87d2f60e28b672deade0ac70b8642a1e49c725cf0c66d267f9f2da8023
159ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
contractService.ts:535 ✅ Approval confirmed
contractService.ts:538 🎲 Placing YES bet...
113ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
marketStatusService.ts:77 🔍 Checking 4 markets for status updates...
1581ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
contractService.ts:540 ⏳ Waiting for bet transaction: 0xd85e18bdaab82c9e08fe7352dad480a38ce9122f2641aa2a93b4c082b2cf7bee
272ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
contractService.ts:544 ✅ Bet placed successfully!
App.tsx:1041 ✅ Transaction confirmed: 0xd85e18bdaab82c9e08fe7352dad480a38ce9122f2641aa2a93b4c082b2cf7bee
App.tsx:1042 📊 Shares: 43.0, Cost: 21.726260401370533519 CAST
userDataService.ts:263 ✅ Bet bet_1763304758852 updated with transaction data: 43.0 shares @ 21.726260401370533519 CAST (TX: 0xd85e18bdaab82c9e08fe7352dad480a38ce9122f2641aa2a93b4c082b2cf7bee)
App.tsx:1084 🔄 Refreshing wallet balances after successful trade...
App.tsx:1120 🎯 Refreshing market odds after trade placement for market: market_1763304685689_zbmeggou7
App.tsx:1123 📍 Using contract address: 0x6dd70682fbf909413a9CAFE8161a23d4f27d46e2
App.tsx:1124 ⏰ Setting refresh timeouts after transaction sent...
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763304800293
App.tsx:1354 🎯 renderCurrentPage called, isLoading: false currentTab: markets
App.tsx:1375 🎯 About to render main content
App.tsx:1380 🏪 Rendering unified markets with 177 markets
146ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
walletService.ts:125 🔄 Attempting to get balance (attempt 1/3)...
60ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
App.tsx:1128 🚀 EXECUTING refreshMarketOddsWithAddress (attempt 1)...
App.tsx:188 🔄 Refreshing market odds for market_1763304685689_zbmeggou7 using direct BSC contract address: 0x6dd70682fbf909413a9CAFE8161a23d4f27d46e2
41ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
walletService.ts:127 ✅ Balance retrieved successfully
22ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
App.tsx:295 ❌ Failed to refresh market odds for market_1763304685689_zbmeggou7 with direct address: Error: response body is not valid JSON (operation="bodyJson", info={ "response": {  } }, code=UNSUPPORTED_OPERATION, version=6.15.0)
    at makeError (ethers.js?v=ae605cb5:337:15)
    at assert (ethers.js?v=ae605cb5:350:11)
    at get bodyJson (ethers.js?v=ae605cb5:1658:7)
    at JsonRpcProvider._send (ethers.js?v=ae605cb5:19561:25)
    at async ethers.js?v=ae605cb5:19464:26
refreshMarketOddsWithAddress @ App.tsx:295
await in refreshMarketOddsWithAddress
(anonymous) @ App.tsx:1129Understand this error
51ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
automaticResolutionMonitor.ts:85 
🔍 Checking for expired markets to resolve...
automaticResolutionMonitor.ts:438 
🔍 Checking for expired evidence collection periods...
33ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
automaticResolutionMonitor.ts:110 ✅ No expired markets to resolve
ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
marketStatusService.ts:77 🔍 Checking 4 markets for status updates...
6ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
automaticResolutionMonitor.ts:462 ✅ No evidence collection periods have expired
24ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
App.tsx:1092 💰 Balance update after trade: {bnb: '0.2220821683', cast: '9999684.900868537606159743', change: 'BNB: -0.0037 (gas fees)', stakePaid: '43 CAST (from CAST balance)'}
App.tsx:102 🔥 APP COMPONENT RENDER - timestamp: 1763304805275
App.tsx:1354 🎯 renderCurrentPage called, isLoading: false currentTab: markets
App.tsx:1375 🎯 About to render main content
App.tsx:1380 🏪 Rendering unified markets with 177 markets
215ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
App.tsx:1133 🔄 EXECUTING refreshMarketOddsWithAddress (attempt 2)...
App.tsx:188 🔄 Refreshing market odds for market_1763304685689_zbmeggou7 using direct BSC contract address: 0x6dd70682fbf909413a9CAFE8161a23d4f27d46e2
45ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
App.tsx:295 ❌ Failed to refresh market odds for market_1763304685689_zbmeggou7 with direct address: Error: response body is not valid JSON (operation="bodyJson", info={ "response": {  } }, code=UNSUPPORTED_OPERATION, version=6.15.0)
    at makeError (ethers.js?v=ae605cb5:337:15)
    at assert (ethers.js?v=ae605cb5:350:11)
    at get bodyJson (ethers.js?v=ae605cb5:1658:7)
    at JsonRpcProvider._send (ethers.js?v=ae605cb5:19561:25)
    at async ethers.js?v=ae605cb5:19464:26
refreshMarketOddsWithAddress @ App.tsx:295
await in refreshMarketOddsWithAddress
(anonymous) @ App.tsx:1134Understand this error
486ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
App.tsx:1138 🔄 EXECUTING refreshMarketOddsWithAddress (attempt 3)...
App.tsx:188 🔄 Refreshing market odds for market_1763304685689_zbmeggou7 using direct BSC contract address: 0x6dd70682fbf909413a9CAFE8161a23d4f27d46e2
70ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)
App.tsx:295 ❌ Failed to refresh market odds for market_1763304685689_zbmeggou7 with direct address: Error: response body is not valid JSON (operation="bodyJson", info={ "response": {  } }, code=UNSUPPORTED_OPERATION, version=6.15.0)
    at makeError (ethers.js?v=ae605cb5:337:15)
    at assert (ethers.js?v=ae605cb5:350:11)
    at get bodyJson (ethers.js?v=ae605cb5:1658:7)
    at JsonRpcProvider._send (ethers.js?v=ae605cb5:19561:25)
    at async ethers.js?v=ae605cb5:19464:26
refreshMarketOddsWithAddress @ App.tsx:295
await in refreshMarketOddsWithAddress
(anonymous) @ App.tsx:1139Understand this error
307ethers.js?v=ae605cb5:19090 JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)