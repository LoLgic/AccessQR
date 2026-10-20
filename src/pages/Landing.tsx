import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Problems from '../components/Problems'
import Solution from '../components/Solution'
import HowItWorks from '../components/HowItWorks'
import Features from '../components/Features'
import Security from '../components/Security'
import FinalCTA from '../components/FinalCTA'
import Footer from '../components/Footer'

export default function Landing() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Problems />
        <Solution />
        <HowItWorks />
        <Features />
        <Security />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
