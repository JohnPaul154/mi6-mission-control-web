import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="min-h-screen w-full p-6 flex flex-1 flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold mb-6">Welcome Agent</h1>

      {/* Vertical Layout for Cards with Padding */}
      <div className="space-y-6 w-full max-w-xl">
        {/* Mission Card */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Our mission is to empower individuals and organizations with innovative tools, fostering collaboration, creativity, and success across all industries.
            </CardDescription>
          </CardContent>
          <CardFooter>
            {/* Optionally add any footer content here */}
          </CardFooter>
        </Card>

        {/* Vision Card */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Vision</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              We envision a world where technology and innovation drive sustainable growth, bringing positive change to communities and creating opportunities for all.
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
