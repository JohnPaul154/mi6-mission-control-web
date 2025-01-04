
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
// Profile Card

interface ProfileCardProps {
  imageSrc: string;
  name: string;
  position: string;
  status: boolean;
}

export function ProfileCard({ imageSrc, name, position, status }: ProfileCardProps) {
  return (
    <Card className="flex w-full max-w-md items-center pt-2 pb-2 px-4">
      
      <Avatar className="flex-none w-20 h-20">
        <AvatarImage src={imageSrc} alt={`${name}'s avatar`} />
        <AvatarFallback>{name[0]}</AvatarFallback>
      </Avatar>
      
      <CardContent>
        <div className="flex-1 mt-6 flex flex-col justify-content">
          <p className="text-lg font-bold">{name}</p>
          <p className="text-sm text-gray-500">{position}</p>
          <p
            className={`text-sm font-medium ${
              status ? "text-green-500" : "text-red-500"
            }`}
          >
            {status ? "Active" : "Inactive"}
          </p>
        </div>
      </CardContent>
      
    </Card>
  );
};