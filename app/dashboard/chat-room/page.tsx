import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ChatRoomPage() {
  return (
    <div className="min-h-screen w-full p-6 flex flex-1 flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold mb-6">Currently Under Construction</h1>

      {/* Vertical Layout for Cards with Padding */}
      <div className="space-y-6 w-full max-w-xl">
        {/* Mission Card */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Notice</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              This is page/feature is coming soon.
            </CardDescription>
          </CardContent>
          <CardFooter>
            {/* Optionally add any footer content here */}
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
