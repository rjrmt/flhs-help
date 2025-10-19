import { Folder } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HistoryPage() {
  return (
    <div className="container py-8">
      <div className="flex items-center gap-3 mb-8">
        <Folder className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Student History</h1>
          <p className="text-muted-foreground">Full timeline & notes</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The student history system is currently under development. 
            This feature will provide a comprehensive timeline and notes for each student.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
