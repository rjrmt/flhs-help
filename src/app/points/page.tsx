import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PointsPage() {
  return (
    <div className="container py-8">
      <div className="flex items-center gap-3 mb-8">
        <Star className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Positive Points</h1>
          <p className="text-muted-foreground">Reward positive behavior</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The positive points system is currently under development. 
            This feature will allow you to reward students for positive behavior and track their progress.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
