import { MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LocatorPage() {
  return (
    <div className="container py-8">
      <div className="flex items-center gap-3 mb-8">
        <MapPin className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Student Locator</h1>
          <p className="text-muted-foreground">Where a student last was</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The student locator system is currently under development. 
            This feature will help you track where students were last seen on campus.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
