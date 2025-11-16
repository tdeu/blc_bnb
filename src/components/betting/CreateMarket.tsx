import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowLeft, Plus, Sparkles, Upload, X, Image } from 'lucide-react';
import { toast } from 'sonner';
import { BettingMarket } from './BettingMarkets';
import { uploadMarketImage } from '../../utils/supabase';
import { MARKET_CREATION } from '../../config/constants';
import { validateMarketExpirationDate, debugTimeComparison } from '../../utils/timeUtils';

interface CreateMarketProps {
  onBack: () => void;
  onCreateMarket: (market: Partial<BettingMarket>) => void;
  marketContext?: 'truth-markets' | 'verify-truth';
}

export default function CreateMarket({ onBack, onCreateMarket, marketContext = 'truth-markets' }: CreateMarketProps) {
  const [formData, setFormData] = useState({
    claim: '',
    description: '',
    category: '',
    country: '',
    region: ''
  });
  const [expirationDate, setExpirationDate] = useState<Date>();
  const [isCreating, setIsCreating] = useState(false);
  const [creatingStatus, setCreatingStatus] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const categories = [
    'Politics', 'Finance', 'Sports', 'Entertainment', 
    'Technology', 'Health', 'Climate', 'Celebrity Gossip'
  ];

  const countries = [
    'Nigeria', 'Kenya', 'South Africa', 'Ghana', 'Morocco', 
    'Senegal', 'Egypt', 'Tanzania', 'Uganda', 'Ethiopia'
  ];

  const regions = [
    'West Africa', 'East Africa', 'Southern Africa', 
    'North Africa', 'Central Africa', 'Continental Africa'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const uploadImageToSupabase = async (imageFile: File): Promise<string | null> => {
    try {
      const result = await uploadMarketImage(imageFile);

      if (result.success && result.url) {
        return result.url;
      } else {
        console.error('Image upload failed:', result.error);
        toast.error('Failed to upload image: ' + result.error);
        return null;
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  const handleSubmit = async () => {
    // For truth markets (future events), expiration date is required
    // For verify truth (past events), expiration date is not required
    const requiresExpirationDate = marketContext === 'truth-markets';

    if (!formData.claim || !formData.description || !formData.category || (requiresExpirationDate && !expirationDate)) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!selectedImage) {
      toast.error('Please upload a photo for your market');
      return;
    }

    if (formData.claim.length < MARKET_CREATION.MIN_CLAIM_LENGTH) {
      toast.error(`Market claim must be at least ${MARKET_CREATION.MIN_CLAIM_LENGTH} characters`);
      return;
    }

    // Only validate expiration date if it's required (truth markets)
    if (requiresExpirationDate && expirationDate) {
      // Use proper timezone-aware validation
      debugTimeComparison(expirationDate, 'Selected Expiration');

      // Use default validation (includes 30-min blockchain safety buffer)
      const validation = validateMarketExpirationDate(expirationDate);

      if (!validation.valid) {
        toast.error(validation.error || 'Invalid expiration date');
        return;
      }

      console.log('✅ Expiration date is valid (with blockchain safety buffer)');
    }

    setIsCreating(true);
    setCreatingStatus('Preparing market data...');

    try {
      let imageUrl: string | undefined = undefined;

      // Upload image first if one is selected
      console.log('🔍 DEBUG: selectedImage exists?', !!selectedImage);
      console.log('🔍 DEBUG: selectedImage details:', selectedImage);

      if (selectedImage) {
        console.log('🖼️ Uploading image to Supabase...', selectedImage.name);
        setCreatingStatus('Uploading market image...');
        imageUrl = await uploadImageToSupabase(selectedImage);
        if (!imageUrl) {
          // Image upload failed, but continue anyway (image is optional)
          console.warn('⚠️ Image upload failed, continuing without image');
          toast.warning('Image upload failed. Market will be created without image.');
        } else {
          console.log('✅ Image uploaded successfully:', imageUrl);
        }
      }

      const newMarket: Partial<BettingMarket> = {
        ...formData,
        expiresAt: marketContext === 'truth-markets' ? expirationDate : new Date(), // Past events expire immediately
        status: 'pending', // Markets now require admin approval
        trending: false,
        totalPool: 0,
        yesPool: 0,
        noPool: 0,
        yesOdds: 2.0,
        noOdds: 2.0,
        totalCasters: 0,
        imageUrl: imageUrl // Include the uploaded image URL
      };

      console.log('📤 Creating market with data:', {
        claim: newMarket.claim,
        imageUrl: newMarket.imageUrl,
        hasImage: !!imageUrl
      });

      setCreatingStatus('Submitting to blockchain (this may take 30-60 seconds)...');
      await onCreateMarket(newMarket);
      setCreatingStatus('Market created successfully!');
      setTimeout(() => onBack(), 1000);
    } catch (error) {
      toast.error('Failed to create market. Please try again.');
      setCreatingStatus('');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Markets
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Plus className="h-6 w-6" />
            {marketContext === 'truth-markets' ? 'Create Truth Market' : 'Submit Past Event'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {marketContext === 'truth-markets'
              ? 'Create a new prediction market for community truth verification'
              : 'Submit a past event for truth verification and community review'
            }
          </p>
        </div>
      </div>

      {/* Create Market Form */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Market Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Market Claim */}
          <div className="space-y-2">
            <Label htmlFor="claim">
              Market Claim <span className="text-red-500">*</span>
            </Label>
            <Input
              id="claim"
              value={formData.claim}
              onChange={(e) => handleInputChange('claim', e.target.value)}
              placeholder="Will [specific event] happen by [date]?"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Make it specific and verifiable. Example: "Will Nigeria's GDP growth exceed 5% in 2025?"
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Provide context and details about this market..."
              className="min-h-[100px] text-sm"
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label htmlFor="image-upload">
              Upload Photo <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-3">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Market preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={removeImage}
                    className="absolute top-2 right-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="sr-only"
                    style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}
                  />
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Image className="h-8 w-8 text-muted-foreground" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Click to upload an image</p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              This photo will be visible to admins during validation and displayed on the market card once approved.
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>
              Category <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country (Optional)</Label>
              <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Region (Optional)</Label>
              <Select value={formData.region} onValueChange={(value) => handleInputChange('region', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expiration Date */}
          {marketContext === 'truth-markets' && (
            <div className="space-y-2">
              <Label htmlFor="expirationDate">
                Expiration Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="expirationDate"
                type="datetime-local"
                value={expirationDate && !isNaN(expirationDate.getTime())
                  ? new Date(expirationDate.getTime() - expirationDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                  : ''}
                onChange={(e) => {
                  const dateStr = e.target.value;
                  if (dateStr) {
                    // datetime-local gives us "YYYY-MM-DDTHH:mm" in local time
                    // When we do new Date(dateStr), it parses it as UTC
                    // We need to create a Date that represents the local time the user selected
                    const [datePart, timePart] = dateStr.split('T');
                    const [year, month, day] = datePart.split('-').map(Number);
                    const [hours, minutes] = timePart.split(':').map(Number);
                    // Create date using local timezone
                    const date = new Date(year, month - 1, day, hours, minutes);
                    setExpirationDate(date);
                  } else {
                    setExpirationDate(undefined);
                  }
                }}
                min={(() => {
                  const now = new Date();
                  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                })()}
                className="text-sm"
              />
              {expirationDate && (() => {
                const now = new Date();
                const diff = expirationDate.getTime() - now.getTime();
                const minutes = Math.floor(diff / 1000 / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);

                let durationText = '';
                if (days > 0) {
                  durationText = `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${(hours % 24) !== 1 ? 's' : ''}`;
                } else if (hours > 0) {
                  durationText = `${hours} hour${hours > 1 ? 's' : ''} ${minutes % 60} minute${(minutes % 60) !== 1 ? 's' : ''}`;
                } else {
                  durationText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
                }

                const isValid = diff > 0;
                const isTooShort = minutes < 10;

                return (
                  <div className={`text-xs mt-1 p-2 rounded ${
                    !isValid ? 'bg-red-50 text-red-600 border border-red-200' :
                    isTooShort ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                    'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {!isValid ? (
                      <span>⚠️ Market must expire in the future</span>
                    ) : isTooShort ? (
                      <span>⚡ Very short market: expires in {durationText} (min recommended: 10 minutes)</span>
                    ) : (
                      <span>✅ Market will expire in {durationText}</span>
                    )}
                  </div>
                );
              })()}
              <p className="text-xs text-muted-foreground">
                Markets can be as short as 10 minutes or longer. Select when this prediction should be resolved.
              </p>
            </div>
          )}

          {/* Add explanation for verify truth */}
          {marketContext === 'verify-truth' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Past Event Submission:</strong> This event will be automatically resolved by AI analysis.
                No expiration date is needed since this concerns a past event.
              </p>
            </div>
          )}

          {/* Collateral Notice */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">💰</span>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                  Market Creation Collateral
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  Creating a market requires <strong>0.001 BNB</strong> collateral (~$0.60). This helps prevent spam and ensures quality markets.
                  You can get testnet BNB from the <a href="https://testnet.bnbchain.org/faucet-smart" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-900">BNB Testnet Faucet</a>.
                </p>
              </div>
            </div>
          </div>

          {/* Create Button */}
          <div className="pt-4 space-y-2">
            <Button
              onClick={handleSubmit}
              disabled={isCreating}
              className="w-full gap-2 bg-primary hover:bg-primary/90"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Market...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {marketContext === 'truth-markets' ? 'Create Truth Market (0.001 BNB)' : 'Submit Past Event (0.001 BNB)'}
                </>
              )}
            </Button>
            {creatingStatus && (
              <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
                <p className="text-sm text-blue-700 font-medium">
                  {creatingStatus.includes('blockchain') ? '⏳' : creatingStatus.includes('success') ? '✅' : '📤'} {creatingStatus}
                </p>
                {creatingStatus.includes('blockchain') && (
                  <p className="text-xs text-blue-600 mt-1">
                    Please wait while your transaction is confirmed on BSC network
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}