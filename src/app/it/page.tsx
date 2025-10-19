import { Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ITPage() {
  return (
    <div className="container py-8">
      <div className="flex items-center gap-3 mb-8">
        <Wrench className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">IT Help Ticket</h1>
          <p className="text-muted-foreground">Report tech issues</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The IT help ticket system is currently under development. 
            This feature will allow you to report technical issues and track their resolution.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
