'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { SignedIn, SignedOut, UserButton, useUser } from '@/context/SanctumAuthContext'
import { Menu, X, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/axios'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dbAvatar, setDbAvatar] = useState<string | null>(null)
  const headerRef = useRef<HTMLElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const { user } = useUser()

  useEffect(() => {
    if (user) {
      api.get('/api/me')
        .then((res) => {
          const av = res.data?.avatar || res.data?.student?.avatar || res.data?.faculty?.avatar || null;
          setDbAvatar(av);
        })
        .catch(() => setDbAvatar(null));
    }
  }, [user]);

  useGSAP(() => {
    // Header Entrance
    gsap.from(headerRef.current, {
      y: -100,
      duration: 1.2,
      ease: "power4.out",
    });

    // Scroll Progress Bar
    gsap.to(progressBarRef.current, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        scrub: 0.3,
        start: "top top",
        end: "bottom bottom",
        trigger: "body",
      }
    });

    // Sticky Header Animation
    ScrollTrigger.create({
      start: "top -50px",
      onEnter: () => {
        gsap.to(headerRef.current, {
          backgroundColor: "rgba(var(--sticky-bg-rgb), 0.9)",
          backdropFilter: "blur(12px)",
          paddingTop: "12px",
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(var(--color-brand-primary-rgb), 0.1)",
          duration: 0.4,
          ease: "power2.out"
        });
      },
      onLeaveBack: () => {
        gsap.to(headerRef.current, {
          backgroundColor: "transparent",
          backdropFilter: "blur(0px)",
          paddingTop: "20px",
          paddingBottom: "20px",
          borderBottom: "none",
          duration: 0.4,
          ease: "power2.out"
        });
      }
    });
  }, { scope: headerRef });

  const navLinks = [
    { label: 'Overview', href: '/#overview' },
    { label: 'Modules', href: '/#modules' },
    { label: 'Roles', href: '/#roles' },
    { label: 'Start', href: '/#start' },
  ]

  return (
    <header
      ref={headerRef}
      className="fixed top-0 left-0 right-0 z-50 bg-transparent py-5"
    >
      {/* Scroll Progress Bar */}
      <div
        ref={progressBarRef}
        className="absolute top-0 left-0 right-0 h-0.5 origin-left z-50 pointer-events-none scale-x-0"
        style={{
          background: 'linear-gradient(90deg, var(--color-brand-primary), var(--color-brand-secondary), var(--color-brand-primary))'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group relative">
            <div className="h-13 w-13 shrink-0 overflow-hidden transition-all duration-500 group-hover:rotate-3 group-hover:scale-105">
              <Image
                src="/collegelogo.png"
                alt="Nova Technology logo"
                width={146}
                height={108}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tighter text-brand-dark dark:text-foreground uppercase leading-none">
                Nova Tech
              </span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-brand-secondary uppercase leading-none mt-1">
                ERP Portal
              </span>
            </div>

            {/* Logo Glow */}
            <div className="absolute -inset-2 bg-brand-primary/15 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`relative px-4 py-2 text-sm font-semibold transition-colors group/nav ${pathname === '/' ? 'text-brand-dark/80 hover:text-brand-dark dark:text-foreground/80 dark:hover:text-foreground' : 'text-brand-dark/70 hover:text-brand-dark dark:text-foreground/70 dark:hover:text-foreground'
                  }`}
              >
                {link.label}
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-linear-to-r from-brand-primary to-brand-secondary origin-left scale-x-0 group-hover/nav:scale-x-100 transition-transform duration-300" />
              </Link>
            ))}
            <SignedIn>
              <Link
                href="/dashboard"
                className="relative px-4 py-2 text-sm font-semibold text-brand-dark/80 hover:text-brand-dark transition-colors group/nav dark:text-foreground/80 dark:hover:text-foreground"
              >
                Dashboard
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-linear-to-r from-brand-primary to-brand-secondary origin-left scale-x-0 group-hover/nav:scale-x-100 transition-transform duration-300" />
              </Link>
            </SignedIn>
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-4">
            <SignedOut>
              <Button asChild variant="outline" className="border-brand-primary/25 bg-brand-white hover:bg-brand-primary/5 dark:bg-card dark:hover:bg-accent/40">
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild className="bg-brand-primary text-brand-white hover:bg-brand-primary/90">
                <Link href="/sign-up">Create Account</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-3 pl-4 border-l border-brand-primary/15">
                <div className="relative h-9 w-9 flex items-center justify-center">
                  {dbAvatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={dbAvatar}
                      alt="Profile Avatar"
                      className="absolute inset-0 h-9 w-9 rounded-full object-cover ring-2 ring-brand-primary/30 pointer-events-none z-10"
                    />
                  ) : null}
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: 'h-9 w-9 ring-2 ring-brand-primary/20 ring-offset-2 ring-offset-brand-light transition-all hover:ring-brand-primary dark:ring-offset-background',
                        userButtonPopoverCard: 'shadow-2xl border border-brand-primary/15 bg-brand-white dark:bg-card',
                      },
                    }}
                  />
                </div>
              </div>
            </SignedIn>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className={`md:hidden p-2.5 rounded-xl transition-all ${mobileMenuOpen
              ? 'bg-brand-primary text-brand-white'
              : 'text-brand-dark/70 hover:text-brand-dark hover:bg-brand-white/70 dark:text-foreground/70 dark:hover:text-foreground dark:hover:bg-card/70'
              }`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden overflow-hidden border-t border-brand-primary/10 mt-4"
              id="mobile-menu"
            >
              <div className="py-6 space-y-2">
                {[...navLinks, { label: 'Dashboard', href: '/dashboard', auth: true }].map((link: { label: string; href: string; auth?: boolean }, i) => (
                  <motion.div
                    key={link.label}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {!link.auth ? (
                      <Link
                        href={link.href}
                        className="flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-bold text-brand-dark/70 hover:text-brand-dark hover:bg-brand-primary/5 transition-all group dark:text-foreground/70 dark:hover:text-foreground dark:hover:bg-accent/40"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {link.label}
                        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ) : (
                      <SignedIn>
                        <Link
                          href={link.href}
                          className="flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-bold text-brand-dark/70 hover:text-brand-dark hover:bg-brand-primary/5 transition-all group dark:text-foreground/70 dark:hover:text-foreground dark:hover:bg-accent/40"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {link.label}
                          <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </SignedIn>
                    )}
                  </motion.div>
                ))}

                <div className="pt-6 border-t border-brand-primary/10 mt-6 grid grid-cols-2 gap-3">
                  <SignedOut>
                    <Button asChild variant="outline" className="col-span-1 border-brand-primary/25 bg-brand-white dark:bg-card" onClick={() => setMobileMenuOpen(false)}>
                      <Link href="/sign-in">Sign In</Link>
                    </Button>
                    <Button asChild className="col-span-1 bg-brand-primary text-brand-white hover:bg-brand-primary/90" onClick={() => setMobileMenuOpen(false)}>
                      <Link href="/sign-up">Create</Link>
                    </Button>
                  </SignedOut>
                  <SignedIn>
                    <div className="col-span-2 flex items-center gap-4 bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10 dark:bg-accent/20">
                      <UserButton afterSignOutUrl="/" />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-brand-dark dark:text-foreground">Account Settings</span>
                        <span className="text-xs text-brand-dark/60 dark:text-muted-foreground">Manage your profile</span>
                      </div>
                    </div>
                  </SignedIn>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

export default Header