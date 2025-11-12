import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { Wallet, CreditCard, ArrowUpDown, Zap, Shield, Globe, CheckCircle, AlertCircle, ExternalLink, Smartphone, GripVertical, Minimize2, Maximize2, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  rate: number; // Rate to USD
}

interface PaymentProvider {
  id: string;
  name: string;
  logo: string;
  type: 'crypto' | 'local' | 'mobile';
  fees: string;
  processingTime: string;
  supportedCurrencies: string[];
  popular?: boolean;
}

interface Position {
  x: number;
  y: number;
}

const africanCurrencies: CurrencyOption[] = [
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', rate: 0.0012 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪', rate: 0.0077 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', rate: 0.055 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭', rate: 0.082 },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', flag: '🇪🇹', rate: 0.018 },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', rate: 1.0 }
];

const paymentProviders: PaymentProvider[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    logo: '🦊',
    type: 'crypto',
    fees: '0.5%',
    processingTime: 'Instant',
    supportedCurrencies: ['HBAR', 'USDC', 'DAI'],
    popular: true
  },
  {
    id: 'yellowcard',
    name: 'Yellow Card',
    logo: '💳',
    type: 'local',
    fees: '1.5%',
    processingTime: '2-5 minutes',
    supportedCurrencies: ['NGN', 'KES', 'ZAR', 'GHS'],
    popular: true
  },
  {
    id: 'binance',
    name: 'Binance Pay',
    logo: '🟡',
    type: 'crypto',
    fees: '0.1%',
    processingTime: 'Instant',
    supportedCurrencies: ['BNB', 'USDT', 'HBAR']
  },
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    logo: '💸',
    type: 'local',
    fees: '2.5%',
    processingTime: '5-10 minutes',
    supportedCurrencies: ['NGN', 'KES', 'ZAR', 'GHS', 'ETB']
  },
  {
    id: 'mpesa',
    name: 'M-Pesa',
    logo: '📱',
    type: 'mobile',
    fees: '1.0%',
    processingTime: '1-3 minutes',
    supportedCurrencies: ['KES']
  },
  {
    id: 'mtn',
    name: 'MTN Mobile Money',
    logo: '📲',
    type: 'mobile',
    fees: '1.2%',
    processingTime: '2-5 minutes',
    supportedCurrencies: ['GHS', 'NGN']
  }
];

export default function LocalCurrencyWallet() {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption>(africanCurrencies[0]);
  const [amount, setAmount] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  
  // Floating widget state
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const hbarPrice = 0.05; // Mock HBAR price in USD (approximately $0.05)

  // Load saved position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('walletWidgetPosition');
    const savedMinimized = localStorage.getItem('walletWidgetMinimized');
    const savedVisible = localStorage.getItem('walletWidgetVisible');
    
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (e) {
        console.warn('Failed to parse saved position');
      }
    }
    
    if (savedMinimized) {
      setIsMinimized(JSON.parse(savedMinimized));
    }
    
    if (savedVisible !== null) {
      setIsVisible(JSON.parse(savedVisible));
    }
  }, []);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('walletWidgetPosition', JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    localStorage.setItem('walletWidgetMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    localStorage.setItem('walletWidgetVisible', JSON.stringify(isVisible));
  }, [isVisible]);

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!widgetRef.current) return;
    
    const rect = widgetRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const widgetWidth = isMinimized ? 300 : 400;
    const widgetHeight = isMinimized ? 60 : 600;
    
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    // Constrain to viewport
    newX = Math.max(0, Math.min(newX, viewportWidth - widgetWidth));
    newY = Math.max(0, Math.min(newY, viewportHeight - widgetHeight));
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!widgetRef.current) return;
    
    const touch = e.touches[0];
    const rect = widgetRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const widgetWidth = isMinimized ? 300 : 400;
    const widgetHeight = isMinimized ? 60 : 600;
    
    let newX = touch.clientX - dragOffset.x;
    let newY = touch.clientY - dragOffset.y;
    
    // Constrain to viewport
    newX = Math.max(0, Math.min(newX, viewportWidth - widgetWidth));
    newY = Math.max(0, Math.min(newY, viewportHeight - widgetHeight));
    
    setPosition({ x: newX, y: newY });
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset]);

  const calculateHBAR = () => {
    if (!amount || isNaN(Number(amount))) return '0.000';
    const usdAmount = Number(amount) * selectedCurrency.rate;
    const hbarAmount = usdAmount / hbarPrice;
    return hbarAmount.toFixed(3);
  };

  const calculateFees = () => {
    if (!selectedProvider || !amount || isNaN(Number(amount))) return '0.00';
    const usdAmount = Number(amount) * selectedCurrency.rate;
    const feePercentage = parseFloat(selectedProvider.fees.replace('%', '')) / 100;
    return (usdAmount * feePercentage).toFixed(2);
  };

  const handleConnect = (provider: PaymentProvider) => {
    setSelectedProvider(provider);
    setShowProviderDialog(false);
    
    toast.success(
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>Connected to {provider.name}! 🎉</span>
      </div>
    );
  };

  const handleFundWallet = () => {
    if (!amount || !selectedProvider) {
      toast.error('Please select amount and payment method');
      return;
    }

    toast.success(
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <span>Wallet funded with {calculateHBAR()} HBAR! 💰</span>
      </div>
    );
    
    setAmount('');
  };

  const getProvidersByType = (type: string) => {
    return paymentProviders.filter(p => p.type === type);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const closeWidget = () => {
    setIsVisible(false);
  };

  // Show minimized floating button to reopen
  if (!isVisible) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50"
        style={{ zIndex: 9999 }}
      >
        <Button
          onClick={() => setIsVisible(true)}
          className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Wallet className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Floating Widget */}
      <div
        ref={widgetRef}
        className={`fixed z-50 transition-all duration-300 ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: isMinimized ? '320px' : '400px',
          maxHeight: isMinimized ? '60px' : '90vh',
          zIndex: 9999
        }}
      >
        <Card className="shadow-2xl border-2 border-primary/20 bg-card/95 backdrop-blur-sm overflow-hidden">
          {/* Header with drag handle */}
          <div
            ref={dragHandleRef}
            className={`flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border/50 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">Fund Wallet</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMinimize}
                className="h-8 w-8 p-0 hover:bg-muted/50"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeWidget}
                className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Minimized state */}
          {isMinimized && (
            <div className="p-3">
              <p className="text-sm text-muted-foreground">
                Convert local currency to crypto • Click to expand
              </p>
            </div>
          )}

          {/* Full content */}
          {!isMinimized && (
            <div className="max-h-[calc(90vh-80px)] overflow-y-auto">
              <CardContent className="space-y-4 p-4">
                {/* Currency Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">From (Local Currency)</Label>
                  <Select 
                    value={selectedCurrency.code} 
                    onValueChange={(value) => {
                      const currency = africanCurrencies.find(c => c.code === value);
                      if (currency) setSelectedCurrency(currency);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{selectedCurrency.flag}</span>
                          <span>{selectedCurrency.code}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {africanCurrencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{currency.flag}</span>
                            <span className="font-medium">{currency.code}</span>
                            <span className="text-muted-foreground text-sm">({currency.name})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      {selectedCurrency.symbol}
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-8 font-semibold"
                    />
                  </div>
                </div>

                {/* Conversion Result */}
                {amount && (
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">You'll receive:</span>
                      <span className="font-bold text-primary">{calculateHBAR()} HBAR</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">USD equivalent:</span>
                      <span className="font-medium">${(Number(amount) * selectedCurrency.rate).toFixed(2)}</span>
                    </div>
                    {selectedProvider && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Fees ({selectedProvider.fees}):</span>
                        <span className="font-medium text-orange-400">${calculateFees()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Provider Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Method</Label>
                  {selectedProvider ? (
                    <div className="p-3 border border-border rounded-lg bg-primary/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{selectedProvider.logo}</span>
                          <div>
                            <p className="font-medium text-sm">{selectedProvider.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedProvider.fees} fee • {selectedProvider.processingTime}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowProviderDialog(true)}>
                          Change
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full h-10 border-dashed"
                      onClick={() => setShowProviderDialog(true)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Select Payment Method
                    </Button>
                  )}
                </div>

                {/* Fund Button */}
                <Button 
                  onClick={handleFundWallet}
                  disabled={!amount || !selectedProvider}
                  className="w-full h-10"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Fund Wallet with {calculateHBAR()} HBAR
                </Button>

                {/* Help Section - Compact */}
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-primary text-sm">New to Crypto?</h4>
                      <p className="text-xs text-muted-foreground">
                        Just select your currency, enter amount, and choose payment method. We handle the conversion!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
          )}
        </Card>
      </div>

      {/* Payment Provider Dialog */}
      <Dialog open={showProviderDialog} onOpenChange={setShowProviderDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              Select how you'd like to fund your wallet. Different methods support different currencies.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="local" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted">
              <TabsTrigger value="local">Local Banks</TabsTrigger>
              <TabsTrigger value="mobile">Mobile Money</TabsTrigger>
              <TabsTrigger value="crypto">Crypto Wallets</TabsTrigger>
            </TabsList>

            <TabsContent value="local" className="space-y-4 mt-6">
              <div className="grid gap-4">
                {getProvidersByType('local').map((provider) => (
                  <Card key={provider.id} className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <CardContent className="p-4" onClick={() => handleConnect(provider)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{provider.logo}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{provider.name}</p>
                              {provider.popular && (
                                <Badge variant="secondary" className="text-xs">Popular</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {provider.fees} fee • {provider.processingTime}
                            </p>
                            <div className="flex gap-2 mt-1">
                              {provider.supportedCurrencies.slice(0, 3).map((curr) => (
                                <Badge key={curr} variant="outline" className="text-xs">
                                  {curr}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Button size="sm">Connect</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="mobile" className="space-y-4 mt-6">
              <div className="grid gap-4">
                {getProvidersByType('mobile').map((provider) => (
                  <Card key={provider.id} className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <CardContent className="p-4" onClick={() => handleConnect(provider)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{provider.logo}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{provider.name}</p>
                              <Badge variant="outline" className="text-xs">
                                <Smartphone className="h-3 w-3 mr-1" />
                                Mobile
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {provider.fees} fee • {provider.processingTime}
                            </p>
                            <div className="flex gap-2 mt-1">
                              {provider.supportedCurrencies.map((curr) => (
                                <Badge key={curr} variant="outline" className="text-xs">
                                  {curr}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Button size="sm">Connect</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="crypto" className="space-y-4 mt-6">
              <div className="grid gap-4">
                {getProvidersByType('crypto').map((provider) => (
                  <Card key={provider.id} className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <CardContent className="p-4" onClick={() => handleConnect(provider)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{provider.logo}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{provider.name}</p>
                              {provider.popular && (
                                <Badge variant="secondary" className="text-xs">Popular</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {provider.fees} fee • {provider.processingTime}
                            </p>
                            <div className="flex gap-2 mt-1">
                              {provider.supportedCurrencies.map((curr) => (
                                <Badge key={curr} variant="outline" className="text-xs">
                                  {curr}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Button size="sm">Connect</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}