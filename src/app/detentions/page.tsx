import { TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DetentionsPage() {
  return (
    <div className="container py-8">
      <div className="flex items-center gap-3 mb-8">
        <TriangleAlert className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Detentions</h1>
          <p className="text-muted-foreground">Assign & track attendance</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The detention management system is currently under development. 
            This feature will allow you to assign detentions and track student attendance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
