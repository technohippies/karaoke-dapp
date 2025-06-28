// This component forces Tailwind to include all the classes we need
// It's never rendered, but ensures the classes are in the CSS bundle
export function ForceClasses() {
  return (
    <div className="hidden">
      {/* Button base classes */}
      <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer dark:focus-visible:ring-neutral-300" />
      
      {/* Button variant classes */}
      <div className="bg-neutral-50 text-neutral-900 shadow hover:bg-neutral-200" />
      <div className="bg-red-500 text-white shadow-sm hover:bg-red-600" />
      <div className="border border-neutral-600 bg-transparent text-neutral-50 hover:bg-neutral-800" />
      <div className="bg-neutral-700 text-neutral-50 shadow-sm hover:bg-neutral-600" />
      <div className="text-neutral-50 hover:bg-neutral-800" />
      <div className="text-neutral-50 underline-offset-4 hover:underline" />
      
      {/* Button size classes */}
      <div className="h-8 px-3 text-xs" />
      <div className="h-9 px-4 py-2" />
      <div className="h-10 px-8" />
      <div className="w-9 p-0" />
      
      {/* Common utility classes */}
      <div className="rounded rounded-sm rounded-md rounded-lg rounded-xl rounded-full" />
      <div className="cursor-pointer cursor-default cursor-not-allowed" />
      <div className="shadow shadow-sm shadow-md shadow-lg shadow-xl shadow-2xl shadow-none" />
      
      {/* LyricLine classes */}
      <div className="w-full px-3 py-1.5 text-left cursor-pointer select-none transition-all rounded" />
      <div className="text-sm font-sans text-neutral-50" />
      <div className="bg-neutral-700 hover:bg-neutral-600" />
      
      {/* Sheet classes */}
      <div className="fixed inset-0 z-50 bg-black/80" />
      <div className="fixed z-50 gap-4 bg-neutral-900 p-6 shadow-lg transition ease-in-out" />
      <div className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-neutral-900 transition-opacity hover:opacity-100" />
      <div className="h-[80vh] h-[400px] h-[200px]" />
      <div className="bottom-0 inset-x-0 border-t" />
      <div className="left-0 inset-y-0 h-full w-3/4 border-r sm:max-w-sm" />
      <div className="right-0 inset-y-0 h-full w-3/4 border-l sm:max-w-sm" />
      <div className="top-0 inset-x-0 border-b" />
      <div className="w-[400px] sm:w-[540px]" />
      <div className="border-neutral-800" />
      
      {/* Sheet close button classes */}
      <div className="bg-neutral-800 hover:bg-neutral-700 h-9 w-9 flex items-center justify-center cursor-pointer" />
      <div className="text-neutral-400 hover:text-neutral-50" />
      <div className="ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" />
      
      {/* Animation classes */}
      <div className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <div className="data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom" />
      <div className="data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left" />
      <div className="data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right" />
      <div className="data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top" />
      
      {/* More utility classes */}
      <div className="pointer-events-none size-4 shrink-0" />
      <div className="sr-only" />
      
      {/* Flexbox and spacing classes */}
      <div className="flex flex-col space-y-2 text-center sm:text-left" />
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2" />
      <div className="text-lg font-semibold" />
      <div className="text-sm text-neutral-300" />
      
      {/* Section height classes */}
      <div className="h-16 h-24" />
      <div className="mt-3 mb-6 rounded-lg" />
    </div>
  );
}