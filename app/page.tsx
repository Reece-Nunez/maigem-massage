'use client'

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-secondary/50">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/maigem-logo.png"
              alt="MaiGem Massage"
              width={50}
              height={50}
              className="h-16 w-16 sm:h-24 sm:w-24"
            />
            <span className="text-lg sm:text-2xl font-semibold text-foreground tracking-wide">MaiGem Massage</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#services" className="hover:text-primary transition-colors text-xl tracking-wide">Services</a>
            <a href="#about" className="hover:text-primary transition-colors text-xl tracking-wide">About</a>
            <a href="#location" className="hover:text-primary transition-colors text-xl tracking-wide">Location</a>
            <a href="/book" className="bg-primary text-white px-5 py-2 rounded-full hover:bg-primary-dark transition-colors text-xl tracking-wide">
              Book Now
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -mr-2 text-foreground hover:bg-secondary/30 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </nav>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-t border-secondary/30">
            <div className="px-4 py-4 space-y-3">
              <a
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-3 px-4 text-lg font-medium text-foreground hover:bg-secondary/30 rounded-lg transition-colors"
              >
                Services
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-3 px-4 text-lg font-medium text-foreground hover:bg-secondary/30 rounded-lg transition-colors"
              >
                About
              </a>
              <a
                href="#location"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-3 px-4 text-lg font-medium text-foreground hover:bg-secondary/30 rounded-lg transition-colors"
              >
                Location
              </a>
              <a
                href="/book"
                className="block py-3 px-4 text-lg font-medium text-center bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Book Now
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4 sm:mb-6">
              Relax. Restore. <span className="text-primary">Rejuvenate.</span>
            </h1>
            <p className="text-base sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto lg:mx-0 tracking-wider font-bold">
              Experience the healing power of professional massage therapy in the heart of Ponca City.
              Located in the tranquil Om Yoga Wellness building.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <a
                href="/book"
                className="bg-primary text-white px-6 sm:px-8 py-3 rounded-full text-base sm:text-lg font-medium hover:bg-primary-dark transition-colors text-center"
              >
                Schedule Appointment
              </a>
              <a
                href="#services"
                className="border-2 border-primary text-primary px-6 sm:px-8 py-3 rounded-full text-base sm:text-lg font-medium hover:bg-primary hover:text-white transition-colors text-center"
              >
                View Services
              </a>
            </div>
          </div>
          <div className="flex-1 flex justify-center mt-8 lg:mt-0">
            <div className="relative">
              <div className="w-56 h-56 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-secondary/30 rounded-full absolute -top-4 -left-4"></div>
              <Image
                src="/maigem-logo.png"
                alt="MaiGem Massage Logo"
                width={350}
                height={350}
                className="relative z-10 rounded-full shadow-xl w-56 h-56 sm:w-72 sm:h-72 md:w-96 md:h-96"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-12 sm:py-20 px-4 sm:px-6 bg-white scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">Our Services</h2>
            <p className="max-w-2xl mx-auto tracking-wider font-bold text-sm sm:text-base">
              Customized massage treatments designed to meet your unique needs and promote overall wellness.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-8">
            {/* Service Card 1 - Back Massage */}
            <div className="bg-background p-5 sm:p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className="w-11 h-11 sm:w-14 sm:h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-sm">30 min</span>
                  <p className="text-base sm:text-lg font-semibold text-primary">Price Varies</p>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">Back Massage</h3>
              <p className="tracking-wider font-bold text-sm sm:text-base">
                30 minutes of pure back bliss! Unwind with a focused back rub, expert hands kneading away tension. Quick, effective relaxation for your busy day.
              </p>
            </div>

            {/* Service Card 2 - Full Body 60 min */}
            <div className="bg-background p-5 sm:p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className="w-11 h-11 sm:w-14 sm:h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-sm">1 hr</span>
                  <p className="text-base sm:text-lg font-semibold text-primary">$80</p>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">Full Body</h3>
              <p className="tracking-wider font-bold text-sm sm:text-base">
                A 60-minute massage usually consists of full body unless otherwise specified. Perfect for overall relaxation and stress relief.
              </p>
            </div>

            {/* Service Card 3 - Full Body 90 min */}
            <div className="bg-background p-5 sm:p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className="w-11 h-11 sm:w-14 sm:h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-sm">1 hr 30 min</span>
                  <p className="text-base sm:text-lg font-semibold text-primary">$110</p>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">Full Body Extended</h3>
              <p className="tracking-wider font-bold text-sm sm:text-base">
                Indulge in bliss with a 90-minute massage, easing tension and promoting relaxation. Expert hands, soothing oils, and tranquility await you.
              </p>
            </div>

            {/* Service Card 4 - Ultimate Relaxation */}
            <div className="bg-background p-5 sm:p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border-2 border-accent/30">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className="w-11 h-11 sm:w-14 sm:h-14 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-sm">2 hr</span>
                  <p className="text-base sm:text-lg font-semibold text-accent">$150</p>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">Ultimate Relaxation</h3>
              <p className="tracking-wider font-bold text-sm sm:text-base">
                Experience the epitome of relaxation with a 2-hour massage. Targeting each muscle with detailed bodywork, it soothes tension and restores balance for profound well-being.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-12 sm:py-20 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <div className="flex-1 w-full">
              <div className="bg-secondary/20 p-4 sm:p-8 rounded-2xl">
                <Image
                  src="/maigem-logo.png"
                  alt="MaiGem Massage"
                  width={400}
                  height={400}
                  className="rounded-xl mx-auto w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96"
                />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 sm:mb-6">About MaiGem Massage</h2>
              <p className="mb-3 sm:mb-4 text-base sm:text-lg tracking-widest font-bold">
                Hi, I&apos;m Crystal Warren, and at MaiGem Massage, I believe in the transformative power of therapeutic touch.
                My mission is to provide a peaceful sanctuary where you can escape the stresses
                of daily life and focus on your well-being.
              </p>
              <p className="mb-4 sm:mb-6 text-base sm:text-lg tracking-widest font-bold">
                Located within the serene Om Yoga Wellness building in downtown Ponca City,
                my space is designed to promote relaxation from the moment you walk through the door.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-foreground tracking-widest text-sm sm:text-base">Licensed & Certified Massage Therapist</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-foreground tracking-widest text-sm sm:text-base">Personalized Treatment Plans</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-foreground tracking-widest text-sm sm:text-base">Tranquil, Welcoming Environment</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section id="location" className="py-12 sm:py-20 px-4 sm:px-6 bg-white scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">Visit Us</h2>
            <p className="tracking-widest text-base sm:text-lg">Located in the Om Yoga Wellness building</p>
          </div>
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
            <div className="flex-1">
              <div className="bg-background p-5 sm:p-8 rounded-2xl h-full">
                <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">Address</h3>
                    <p className="tracking-widest text-sm sm:text-base">
                      Om Yoga Wellness Building<br />
                      205 E Chestnut Ave<br />
                      Ponca City, OK 74604
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">Hours</h3>
                    <p className="tracking-widest text-sm sm:text-base">
                      By Appointment Only<br />
                      Contact to schedule your session
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <div className="rounded-2xl overflow-hidden h-64 sm:h-80 lg:h-full min-h-64 sm:min-h-80">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3227.123!2d-97.0815!3d36.7115!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x87b1f5c8b8b8b8b8%3A0x0!2s205%20E%20Chestnut%20Ave%2C%20Ponca%20City%2C%20OK%2074604!5e0!3m2!1sen!2sus!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="MaiGem Massage Location"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-12 sm:py-20 px-4 sm:px-6 bg-primary scroll-mt-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">Ready to Feel Your Best?</h2>
          <p className="text-white/90 mb-6 sm:mb-8 text-base sm:text-lg px-2">
            Book your massage appointment today and start your journey to relaxation and wellness.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <a
              href="tel:+15803049861"
              className="bg-white text-primary px-6 sm:px-8 py-3 rounded-full text-base sm:text-lg font-medium hover:bg-background transition-colors inline-flex items-center justify-center gap-2 min-h-[48px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call to Book
            </a>
            <a
              href="https://maps.google.com/?q=205+E+Chestnut+Ave,+Ponca+City,+OK+74604"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-white text-white px-6 sm:px-8 py-3 rounded-full text-base sm:text-lg font-medium hover:bg-white hover:text-primary transition-colors inline-flex items-center justify-center gap-2 min-h-[48px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Get Directions
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 bg-foreground text-white/70">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/maigem-logo.png"
              alt="MaiGem Massage"
              width={40}
              height={40}
              className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
            />
            <span className="text-white font-medium text-sm sm:text-base">MaiGem Massage</span>
          </div>
          <p className="text-xs sm:text-sm">
            205 E Chestnut Ave, Ponca City, OK 74604
          </p>
          <p className="text-xs sm:text-sm">
            &copy; {new Date().getFullYear()} MaiGem Massage. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
