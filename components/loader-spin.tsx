import { cn } from "@/lib/utils";


const bars = Array(8).fill(0)

export const Loader = ({
  visible,
  className,
}: { visible: boolean; className?: string }) => {
  return (
    <div className="hamster-loading-wrapper" data-visible={visible}>
      <div className="hamster-spinner">
        {bars.map((_, i) => (
          <div
            className={cn('hamster-loading-bar bg-stone-400', className)}
            key={`hamster-bar-${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export const LoadingSpinner = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={'size-4 animate-spin'}
    >
      <title>LoadingSpinner</title>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
