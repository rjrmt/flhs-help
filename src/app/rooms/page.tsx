import { Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RoomsPage() {
  return (
    <div className="container py-8">
      <div className="flex items-center gap-3 mb-8">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Room & Equipment Finder</h1>
          <p className="text-muted-foreground">Look up rooms & resources</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The room and equipment finder system is currently under development. 
            This feature will help you locate available rooms and equipment on campus.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
