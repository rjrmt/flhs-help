import { DoorOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HallPassPage() {
  return (
    <div className="container py-8">
      <div className="flex items-center gap-3 mb-8">
        <DoorOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Hall Pass</h1>
          <p className="text-muted-foreground">Timed passes for bathroom, nurse, office</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The hall pass system is currently under development. 
            This feature will allow you to issue timed passes for students to leave the classroom.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
