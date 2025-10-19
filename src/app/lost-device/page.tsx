import { Laptop2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LostDevicePage() {
  return (
    <div className="container py-8">
      <div className="flex items-center gap-3 mb-8">
        <Laptop2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Lost/Broken Device</h1>
          <p className="text-muted-foreground">Flag student/school devices</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The lost/broken device reporting system is currently under development. 
            This feature will allow you to flag and track student or school devices that are lost or broken.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
