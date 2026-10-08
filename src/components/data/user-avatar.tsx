import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export function initialsOf(name: string) {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean)
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : (parts[0]?.slice(0, 2) ?? "?")
  return initials.toUpperCase()
}

type UserAvatarProps = {
  name: string
  imageUrl?: string | null
  className?: string
}

export function UserAvatar({ name, imageUrl, className }: UserAvatarProps) {
  return (
    <Avatar className={cn("size-8", className)}>
      {imageUrl ? <AvatarImage src={imageUrl} alt={name} /> : null}
      <AvatarFallback className="bg-linear-to-b from-[#a1a1a6] to-[#8e8e93] text-[11px] font-semibold text-white dark:from-[#636366] dark:to-[#48484a]">
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  )
}
