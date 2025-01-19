
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
  avatar: string;
  name: string;
  position: string;
}

export function ProfileCard({ avatar, name, position }: ProfileCardProps) {
  return (
    <Card className="flex w-full max-w-md items-center px-4">
      
      <Avatar className="flex-none w-20 h-20 ml-4">
        <AvatarImage src={avatar} alt={`${name}'s avatar`} />
        <AvatarFallback>{name[0]}</AvatarFallback>
      </Avatar>
      
      <CardContent>
        <div className="flex-1 mt-6 flex flex-col justify-content">
          <div className="mb-2">
            <p className="text-sm text-gray-500">Name:</p>
            <p className="text-lg font-bold">{name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Position:</p>
            <p className="text-sm">{position}</p>
          </div>
        </div>
      </CardContent>
      
    </Card>
  );
};