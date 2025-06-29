export function TailwindTest() {
  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold">Tailwind CSS Test</h2>
      
      {/* Basic utility classes */}
      <div className="bg-red-500 text-white p-4 rounded">
        Red background with white text (bg-red-500)
      </div>
      
      <div className="bg-blue-500 text-white p-4 rounded-md">
        Blue background with rounded corners (bg-blue-500 rounded-md)
      </div>
      
      <div className="border-2 border-green-500 p-4">
        Green border (border-2 border-green-500)
      </div>
      
      {/* Flexbox test */}
      <div className="flex gap-4">
        <div className="bg-purple-500 p-2 text-white">Flex item 1</div>
        <div className="bg-pink-500 p-2 text-white">Flex item 2</div>
        <div className="bg-yellow-500 p-2 text-black">Flex item 3</div>
      </div>
      
      {/* Custom neutral colors from theme */}
      <div className="bg-neutral-700 text-neutral-50 p-4 rounded">
        Neutral 700 background (bg-neutral-700)
      </div>
      
      {/* Using direct style to verify colors */}
      <div style={{ backgroundColor: 'rgb(64, 64, 64)' }} className="text-white p-4">
        Direct style (should match neutral-700)
      </div>
    </div>
  );
}