import { Star, StarHalf } from "lucide-react";

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex">
      {[...Array(5)].map((_, index) => {
        const filled = index + 1 <= rating; // Full star
        const halfFilled = index + 0.5 === rating; // Half star

        return (
          <span key={index}>
            {filled ? (
              <div className="relative w-[40px] h-[40px] inline-block">
                <Star size={40} className="fill-yellow-400 text-yellow-400 " />
              </div>
            ) : halfFilled ? (
              <div className="relative w-[40px] h-[40px] inline-block">
                <Star size={40} className="text-gray-300 absolute top-0 left-0" />
                <StarHalf size={40} className="fill-yellow-400 text-yellow-400 absolute top-0 left-0" />
              </div>
            ) : (
              <div className="relative w-[40px] h-[40px] inline-block">
                <Star size={40} className="text-gray-300" />
              </div>
            )}
          </span>
        );
      })}
    </div>
  )
}

export default StarRating;