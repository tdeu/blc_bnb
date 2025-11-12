import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: string;
  activeMarkets: number;
  totalVolume: string;
  imageUrl: string;
  trending: boolean;
}

interface CategoriesProps {
  onSelectCategory: (categoryId: string) => void;
}

export default function Categories({ onSelectCategory }: CategoriesProps) {
  const categories: Category[] = [
    {
      id: 'politics',
      name: 'Politics',
      icon: '🏛️',
      activeMarkets: 45,
      totalVolume: '$2.4M',
      imageUrl: 'https://images.unsplash.com/photo-1718145351838-152cfb8f5358?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb25hbGQlMjB0cnVtcCUyMGVsZWN0aW9ufGVufDF8fHx8MTc1NTcxNDc2Nnww&ixlib=rb-4.1.0&q=80&w=1080',
      trending: true
    },
    {
      id: 'crypto',
      name: 'Crypto',
      icon: '₿',
      activeMarkets: 38,
      totalVolume: '$1.8M',
      imageUrl: 'https://images.unsplash.com/photo-1658677414428-d0ae187034cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaXRjb2luJTIwY3J5cHRvY3VycmVuY3l8ZW58MXx8fHwxNzU1NzE0NzY3fDA&ixlib=rb-4.1.0&q=80&w=1080',
      trending: true
    },
    {
      id: 'tech',
      name: 'Technology',
      icon: '💻',
      activeMarkets: 32,
      totalVolume: '$1.2M',
      imageUrl: 'https://images.unsplash.com/photo-1697577418970-95d99b5a55cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpZmljaWFsJTIwaW50ZWxsaWdlbmNlJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NTU2NzcwMDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
      trending: false
    },
    {
      id: 'sports',
      name: 'Sports',
      icon: '⚽',
      activeMarkets: 28,
      totalVolume: '$950K',
      imageUrl: 'https://images.unsplash.com/photo-1693683224122-0a8e206f248d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBmb290YmFsbHxlbnwxfHx8fDE3NTU3MTQ3NzF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      trending: false
    },
    {
      id: 'finance',
      name: 'Finance',
      icon: '💰',
      activeMarkets: 25,
      totalVolume: '$780K',
      imageUrl: 'https://images.unsplash.com/photo-1605759062013-e69aeb188665?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdG9jayUyMG1hcmtldCUyMHRyYWRpbmd8ZW58MXx8fHwxNzU1NjU4MDkxfDA&ixlib=rb-4.1.0&q=80&w=1080',
      trending: false
    },
    {
      id: 'climate',
      name: 'Climate',
      icon: '🌍',
      activeMarkets: 18,
      totalVolume: '$520K',
      imageUrl: 'https://images.unsplash.com/photo-1565011471985-8a450248b005?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGltYXRlJTIwY2hhbmdlJTIwZW52aXJvbm1lbnR8ZW58MXx8fHwxNzU1Njc3ODkxfDA&ixlib=rb-4.1.0&q=80&w=1080',
      trending: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary mb-1">Categories</h2>
          <p className="text-sm text-muted-foreground">Explore prediction markets by topic</p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card 
            key={category.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm"
            onClick={() => onSelectCategory(category.id)}
          >
            <div className="relative h-32 overflow-hidden">
              <img 
                src={category.imageUrl}
                alt={category.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              
              {/* Trending Badge */}
              {category.trending && (
                <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground border-0">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Trending
                </Badge>
              )}

              {/* Category Icon */}
              <div className="absolute bottom-3 left-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <span className="text-xl">{category.icon}</span>
                </div>
              </div>
            </div>
            
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-2">{category.name}</h3>
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  {category.activeMarkets} markets
                </div>
                <div className="text-primary font-semibold">
                  {category.totalVolume}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">186</div>
            <p className="text-sm text-muted-foreground">Active Markets</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-secondary">$7.2M</div>
            <p className="text-sm text-muted-foreground">Total Volume</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-400/10 to-green-400/5 border-green-400/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">12.4K</div>
            <p className="text-sm text-muted-foreground">Traders</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-400/10 to-orange-400/5 border-orange-400/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">24h</div>
            <p className="text-sm text-muted-foreground">Avg Resolution</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}