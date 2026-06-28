import dynamic from 'next/dynamic';
import Background from '@/components/Background';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthRedirect from '@/components/AuthRedirect';

const Hero = dynamic(() => import('@/components/Hero'));
const ForLearners = dynamic(() => import('@/components/ForLearners'), {
  loading: () => <div className="animate-pulse bg-zinc-900 rounded-lg h-64"></div>
});
const Features = dynamic(() => import('@/components/Features'), {
  loading: () => <div className="animate-pulse bg-zinc-900 rounded-lg h-64"></div>
});
const Insights = dynamic(() => import('@/components/Insights'), {
  loading: () => <div className="animate-pulse bg-zinc-900 rounded-lg h-64"></div>
});
const Competency = dynamic(() => import('@/components/Competency'), {
  loading: () => <div className="animate-pulse bg-zinc-900 rounded-lg h-64"></div>
});
const Pricing = dynamic(() => import('@/components/Pricing'), {
  loading: () => <div className="animate-pulse bg-zinc-900 rounded-lg h-96"></div>
});
const DemoForm = dynamic(() => import('@/components/DemoForm'), {
  loading: () => <div className="animate-pulse bg-zinc-900 rounded-lg h-64"></div>
});
const CTA = dynamic(() => import('@/components/CTA'), {
  loading: () => <div className="animate-pulse bg-zinc-900 rounded-lg h-32"></div>
});

export default function Home() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      <AuthRedirect />
      <Background />
      <Header />
      <main>
        <Hero />
        <ForLearners />
        <Features />
        <Insights />
        <Competency />
        <Pricing />
        <DemoForm />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
