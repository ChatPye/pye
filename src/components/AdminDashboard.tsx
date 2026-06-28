import React from 'react';

export default function AdminDashboard() {
  return (
    <section id="admin" className="relative border-t border-zinc-800">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">Admin Dashboard</h2>
          <p className="mt-4 text-lg text-zinc-400">Manage learners, content, and Pods with real-time insights.</p>
        </div>

        <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-950 p-4 lg:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <aside className="lg:col-span-3 rounded-lg border border-zinc-800 bg-black/40 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-md bg-white text-black inline-flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path><path d="M20 2v4"></path><path d="M22 4h-4"></path><circle cx="4" cy="20" r="2"></circle></svg>
                </div>
                <div className="text-sm font-medium">Admin</div>
              </div>
              <nav className="grid gap-1 text-sm">
                <a href="#" className="inline-flex items-center gap-2 rounded-md px-3 py-2 bg-zinc-900 border border-zinc-800 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="m3 9 9-7 9 7"></path><path d="M9 22V12h6v10"></path></svg>
                  Overview
                </a>
                <a href="#" className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-300 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.128a4 4 0 0 1 0 7.744"></path></svg>
                  Users
                </a>
                <a href="#" className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-300 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="2"></rect><path d="M7 2v20"></path><path d="M17 2v20"></path><path d="M2 12h20"></path></svg>
                  Content
                </a>
                <a href="#" className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-300 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="m12.68 2.354 8.63 4.315a1 1 0 0 1 0 1.762L12.68 12.746a1 1 0 0 1-.9 0L3.15 8.43a1 1 0 0 1 0-1.762l8.63-4.315a1 1 0 0 1 .9 0Z"></path><path d="m22 9.5-9.32 4.66a1 1 0 0 1-.9 0L2.5 9.5"></path><path d="m22 14.5-9.32 4.66a1 1 0 0 1-.9 0L2.5 14.5"></path></svg>
                  Pods
                </a>
                <a href="#" className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-300 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"></path></svg>
                  Analytics
                </a>
                <a href="#" className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-300 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z"></path><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"></path></svg>
                  Settings
                </a>
              </nav>
              <div className="mt-6 rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="text-xs text-zinc-400">Storage</div>
                <div className="mt-2 h-2 rounded bg-zinc-800 overflow-hidden">
                  <div className="h-full w-[62%] bg-gradient-to-r from-blue-500 to-purple-500"></div>
                </div>
                <div className="mt-2 text-xs text-zinc-500">62% of 100 GB</div>
              </div>
            </aside>

            <main className="lg:col-span-9 rounded-lg border border-zinc-800 bg-black/40 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="inline-flex items-center gap-2">
                  <div className="text-sm font-medium text-white">Overview</div>
                  <span className="text-[11px] text-zinc-500">Last 7 days</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                    <input type="text" placeholder="Search users, content..." className="bg-transparent outline-none placeholder:text-zinc-500 text-xs w-56" />
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path></svg>
                    This week
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path></svg>
                    Export
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-zinc-400">Active learners</div>
                    <span className="text-[11px] text-green-400">+8%</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">1,284</div>
                  <div className="mt-1 text-[11px] text-zinc-500">vs last week</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-zinc-400">New signups</div>
                    <span className="text-[11px] text-green-400">+12%</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">342</div>
                  <div className="mt-1 text-[11px] text-zinc-500">last 7 days</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-zinc-400">Avg. session time</div>
                    <span className="text-[11px] text-zinc-500">mm:ss</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">06:41</div>
                  <div className="mt-1 text-[11px] text-zinc-500">per learner</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-zinc-400">Questions today</div>
                    <span className="text-[11px] text-red-400">-3%</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">219</div>
                  <div className="mt-1 text-[11px] text-zinc-500">AI resolved 88%</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">Engagement</div>
                      <div className="text-xs text-zinc-500">Active users last 7 days</div>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-400 border border-blue-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                      Live
                    </div>
                  </div>
                  <div className="mt-3 rounded-md bg-black/40 border border-zinc-800 p-3">
                    <div className="relative h-44">
                      <canvas id="adminChart"></canvas>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-white">Recent users</div>
                    <a href="#" className="text-xs text-zinc-400 hover:text-white transition">View all</a>
                  </div>
                  <div className="divide-y divide-zinc-800">
                    <div className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img className="h-7 w-7 rounded-full ring-2 ring-zinc-800 object-cover" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=64&auto=format&fit=facearea&facepad=2&h=64" alt="User A" />
                        <div>
                          <div className="text-sm text-zinc-200">Alex Kim</div>
                          <div className="text-xs text-zinc-500">Backend • Pod A</div>
                        </div>
                      </div>
                      <span className="text-[11px] rounded-md border border-green-500/20 bg-green-500/10 text-green-400 px-2 py-1">Active</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img className="h-7 w-7 rounded-full ring-2 ring-zinc-800 object-cover" src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=64&auto=format&fit=facearea&facepad=2&h=64" alt="User B" />
                        <div>
                          <div className="text-sm text-zinc-200">Rosa M.</div>
                          <div className="text-xs text-zinc-500">Frontend • Pod B</div>
                        </div>
                      </div>
                      <span className="text-[11px] rounded-md border border-zinc-500/20 bg-zinc-500/10 text-zinc-300 px-2 py-1">Idle</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img className="h-7 w-7 rounded-full ring-2 ring-zinc-800 object-cover" src="https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=64&auto=format&fit=facearea&facepad=2&h=64" alt="User C" />
                        <div>
                          <div className="text-sm text-zinc-200">Priya N.</div>
                          <div className="text-xs text-zinc-500">DevOps • Pod C</div>
                        </div>
                      </div>
                      <span className="text-[11px] rounded-md border border-blue-500/20 bg-blue-500/10 text-blue-400 px-2 py-1">In session</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center justify-between p-4">
                  <div className="text-sm font-medium text-white">Users</div>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 5h18"></path><path d="M7 12h10"></path><path d="M10 19h4"></path></svg>
                      Filters
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-medium text-black hover:bg-zinc-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M15 14a4 4 0 1 0-8 0a4 4 0 0 0 8 0"></path><path d="M6 8V6a4 4 0 0 1 8 0v2"></path><path d="M2 16h6"></path><path d="M5 13v6"></path></svg>
                      Add user
                    </button>
                  </div>
                </div>
                <div className="border-t border-zinc-800">
                  <div className="grid grid-cols-12 px-4 py-2 text-xs text-zinc-500">
                    <div className="col-span-4">Name</div>
                    <div className="col-span-2">Role</div>
                    <div className="col-span-2">Pod</div>
                    <div className="col-span-2">Last active</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  <div className="divide-y divide-zinc-800 text-sm">
                    <div className="grid grid-cols-12 px-4 py-3 items-center">
                      <div className="col-span-4 flex items-center gap-3">
                        <img className="h-7 w-7 rounded-full ring-2 ring-zinc-800 object-cover" src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=64&auto=format&fit=facearea&facepad=2&h=64" alt="User" />
                        <div>
                          <div className="text-zinc-200">Morgan Sykes</div>
                          <div className="text-xs text-zinc-500">morgan@company.com</div>
                        </div>
                      </div>
                      <div className="col-span-2 text-zinc-300">Admin</div>
                      <div className="col-span-2 text-zinc-300">Pod A</div>
                      <div className="col-span-2 text-zinc-300">2h ago</div>
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <button className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                          Edit
                        </button>
                        <button className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-xs text-red-400 hover:bg-zinc-900">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 px-4 py-3 items-center">
                      <div className="col-span-4 flex items-center gap-3">
                        <img className="h-7 w-7 rounded-full ring-2 ring-zinc-800 object-cover" src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=64&auto=format&fit=facearea&facepad=2&h=64" alt="User" />
                        <div>
                          <div className="text-zinc-200">Jamie Doe</div>
                          <div className="text-xs text-zinc-500">jamie@company.com</div>
                        </div>
                      </div>
                      <div className="col-span-2 text-zinc-300">Instructor</div>
                      <div className="col-span-2 text-zinc-300">Pod B</div>
                      <div className="col-span-2 text-zinc-300">12m ago</div>
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <button className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                          Edit
                        </button>
                        <button className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-xs text-red-400 hover:bg-zinc-900">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 px-4 py-3 items-center">
                      <div className="col-span-4 flex items-center gap-3">
                        <img className="h-7 w-7 rounded-full ring-2 ring-zinc-800 object-cover" src="https://images.unsplash.com/photo-1621619856624-42fd193a0661?w=1080&q=80" alt="User" />
                        <div>
                          <div className="text-zinc-200">Taylor Ray</div>
                          <div className="text-xs text-zinc-500">taylor@company.com</div>
                        </div>
                      </div>
                      <div className="col-span-2 text-zinc-300">Learner</div>
                      <div className="col-span-2 text-zinc-300">Pod C</div>
                      <div className="col-span-2 text-zinc-300">Just now</div>
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <button className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                          Edit
                        </button>
                        <button className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-xs text-red-400 hover:bg-zinc-900">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>
                          Remove
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </section>
  );
}
