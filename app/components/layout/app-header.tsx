import { useEffect, useRef, useState } from "react"
import { BellIcon, SearchIcon, XIcon } from "lucide-react"
import { Link } from "react-router"

import { Avatar, AvatarFallback } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"

type AppHeaderProps = {
  email: string
}

function getInitials(email: string) {
  const base = email.split("@")[0] ?? "User"
  return base.slice(0, 2).toUpperCase()
}

export function AppHeader({ email }: AppHeaderProps) {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isMobileSearchOpen) {
      return
    }

    mobileSearchInputRef.current?.focus()
  }, [isMobileSearchOpen])

  return (
    <header className="bg-background fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b px-3 sm:px-4">
      <div className="flex w-full items-center gap-3">
        <Link to="/push-test" className="shrink-0 font-semibold">
          KMLA Online
        </Link>

        <div className="relative ml-auto hidden w-full max-w-sm md:block">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2" />
          <Input className="h-9 pl-9" placeholder="Search groups, posts, and people" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          aria-expanded={isMobileSearchOpen}
          className="ml-auto md:hidden"
          onClick={() => setIsMobileSearchOpen(true)}
        >
          <SearchIcon />
        </Button>

        <Button variant="ghost" size="icon" aria-label="Notifications">
          <BellIcon />
        </Button>

        <Avatar>
          <AvatarFallback>{getInitials(email)}</AvatarFallback>
        </Avatar>
      </div>

      <div
        className={`bg-background/95 absolute inset-0 z-20 flex items-center gap-2 px-3 backdrop-blur transition-all duration-200 ease-out sm:px-4 md:hidden ${
          isMobileSearchOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2" />

          <Input
            ref={mobileSearchInputRef}
            className="h-9 pl-9"
            placeholder="Search groups, posts, and people"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsMobileSearchOpen(false)
              }
            }}
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Close search"
          onClick={() => setIsMobileSearchOpen(false)}
        >
          <XIcon />
        </Button>
      </div>
    </header>
  )
}
