export default function Background() {
  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/30 to-black"></div>
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:14px_24px] opacity-[0.07]" 
        style={{ transform: 'translateZ(0)' }}
      ></div>
      <div 
        className="absolute top-20 left-10 w-2 h-2 bg-zinc-600 rounded-full opacity-20" 
        style={{ animation: 'float 6s ease-in-out infinite' }}
      ></div>
      <div 
        className="absolute top-40 right-20 w-1 h-1 bg-zinc-500 rounded-full opacity-30" 
        style={{ animation: 'float 6s ease-in-out infinite 2s' }}
      ></div>
      <div 
        className="absolute top-80 left-1/4 w-1.5 h-1.5 bg-zinc-600 rounded-full opacity-25" 
        style={{ animation: 'float 6s ease-in-out infinite 4s' }}
      ></div>
    </div>
  );
}
