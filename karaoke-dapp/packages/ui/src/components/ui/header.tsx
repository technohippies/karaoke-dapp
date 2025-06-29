import * as React from "react"
import { User } from "@phosphor-icons/react"

export interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onAccountClick?: () => void
}

const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  ({ className, onAccountClick, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className="w-full flex items-center px-6 py-4 bg-neutral-800 border-b border-neutral-700"
        {...props}
      >
        <div>
          <img
            src="/logo.png"
            alt="Karaoke dApp"
            className="h-8 w-auto"
          />
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={onAccountClick}
            className="h-9 w-9 rounded-md bg-neutral-700 text-neutral-50 hover:bg-neutral-600 flex items-center justify-center"
            style={{ marginRight: '24px' }}
            aria-label="Account"
          >
            <User size={20} weight="bold" />
          </button>
        </div>
      </div>
    )
  }
)

Header.displayName = "Header"

export { Header }