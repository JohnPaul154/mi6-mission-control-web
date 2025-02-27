import { useState, useEffect } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value?: number; // Optional initial value
  onChange: (rating: number) => void;
  disabled?: boolean; // New prop to disable interactions
}

const StarRatingInput: React.FC<StarRatingProps> = ({ value = 0, onChange, disabled = false }) => {
  const [rating, setRating] = useState(value);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    setRating(value); // Update rating if the prop changes
  }, [value]);

  const handleClick = (newRating: number) => {
    if (!disabled) {
      setRating(newRating);
      onChange(newRating);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((starValue) => (
          <Star
            key={starValue}
            size={40}
            className={`cursor-pointer transition-colors ${
              (hover || rating) >= starValue ? "fill-yellow-400 text-yellow-400" : "fill-gray-300 text-gray-300"
            } ${disabled ? "!cursor-default" : ""}`}
            onMouseEnter={() => !disabled && setHover(starValue)}
            onMouseLeave={() => !disabled && setHover(0)}
            onClick={() => handleClick(starValue)}
          />
        ))}
      </div>
      <input
        type="number"
        min="0"
        max="5"
        value={rating}
        onChange={(e) => handleClick(Number(e.target.value))}
        className="w-12 border rounded px-2 text-center"
        hidden
        disabled={disabled}
      />
    </div>
  );
};

export default StarRatingInput;
