import { 
  CloudUpload, 
  Bot, 
  Users, 
  BadgeCheck, 
  BarChart3, 
  ShieldCheck 
} from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: CloudUpload,
      title: "Import recordings instantly",
      description: "YouTube, Zoom, Google Meet, Teams in one click."
    },
    {
      icon: Bot,
      title: "AI Tutor in every video",
      description: "Get real-time answers and personalized explanations directly from your course content. Learners can ask questions, generate flashcards, and get instant summaries."
    },
    {
      icon: Users,
      title: "Learning Pods",
      description: "Create collaborative cohorts where learners can work together, review flashcards, share projects, and track progress on a live leaderboard."
    },
    {
      icon: BadgeCheck,
      title: "Competency Profiles",
      description: "Our open-source algorithm automate skill verification with portfolios built from every learner interaction, including challenges, assessments, and completed projects."
    },
    {
      icon: BarChart3,
      title: "Aggregated Insights",
      description: "Real-time view of learner questions to improve future training."
    },
    {
      icon: ShieldCheck,
      title: "Enterprise-grade Security",
      description: "SOC2-ready, SSO login, and privacy-first by design."
    }
  ];

  return (
    <section id="features" className="relative border-t border-zinc-800">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">Everything you need to accelerate video-based upskilling</h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div 
                key={index}
                id={index === 2 ? "pods" : undefined}
                className="group rounded-xl border border-zinc-800 bg-zinc-950/50 p-8 transition hover:border-zinc-700 hover:bg-zinc-900/50 hover:shadow-xl"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-black group-hover:scale-105 transition">
                  <IconComponent className="w-6 h-6" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
