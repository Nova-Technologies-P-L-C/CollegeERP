'use client';

import Link from 'next/link'
import Image from 'next/image'
import { Mail, MapPin, Moon, Phone, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => { }
const getSnapshot = () => true
const getServerSnapshot = () => false


const Footer = () => {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot)
  const currentYear = new Date().getFullYear()

  const footerLinks = [
    {
      title: 'Explore',
      links: [
        { label: 'Overview', href: '/#overview' },
        { label: 'Modules', href: '/#modules' },
        { label: 'Role Paths', href: '/#roles' },
        { label: 'Get Started', href: '/#start' },
      ],
    },
    {
      title: 'Access',
      links: [
        { label: 'Create Account', href: '/sign-up' },
        { label: 'Sign In', href: '/sign-in' },
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Admissions', href: '/dashboard/admissions' },
      ],
    },
    {
      title: 'Academic Tools',
      links: [
        { label: 'Courses', href: '/dashboard/courses' },
        { label: 'Attendance', href: '/dashboard/attendance' },
        { label: 'Grades', href: '/dashboard/grades' },
        { label: 'Timetable', href: '/dashboard/timetable' },
      ],
    },
  ]

  return (
    <footer id="contact" className="relative border-t border-brand-primary/15 bg-brand-white pt-16 pb-10 overflow-hidden dark:bg-card">
      {/* Background Dot Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-brand-primary) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute inset-x-0 top-0 -z-10 h-56 bg-linear-to-b from-brand-primary/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-linear-to-t from-brand-secondary/10 to-transparent" />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-primary focus:px-3 focus:py-2 focus:text-brand-white"
      >
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-14">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 group mb-5 relative">
              <div className="h-10 w-10 overflow-hidden transition-all duration-300 group-hover:rotate-[3deg]">
                <Image
                  src="/collegelogo.png"
                  alt="Nova Technology logo"
                  width={146}
                  height={108}
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-xl font-black tracking-tight text-brand-dark dark:text-foreground">Nova Technology</span>
            </Link>
            <p className="text-brand-dark/75 text-sm leading-relaxed max-w-sm mb-7 dark:text-muted-foreground">
              A centralized ERP platform for admissions, attendance, assessments, schedules, and student records powered by Nova Technology.
            </p>

            <div className="space-y-3 text-sm text-brand-dark/80 dark:text-muted-foreground">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-primary" aria-hidden="true" />
                Nova Technology Headquarters
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand-primary" aria-hidden="true" />
                +1 (800) 555-NOVA
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-primary" aria-hidden="true" />
                contact@novatechnology.com
              </p>
            </div>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title} className="lg:col-span-1">
              <h3 className="text-brand-dark font-bold mb-5 text-sm uppercase tracking-wider dark:text-foreground">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-brand-dark/75 hover:text-brand-primary transition-colors dark:text-muted-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 border-t border-brand-primary/15 pt-8 text-xs font-medium text-brand-dark/70 dark:text-muted-foreground text-center lg:text-left">
          <p>© {currentYear} Nova Technology. All rights reserved.</p>

          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => mounted && setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand-primary/20 bg-brand-white px-3 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand-primary/5 dark:bg-background dark:text-foreground dark:hover:bg-accent/40"
              aria-label="Toggle theme"
            >
              <span>Theme</span>
              {mounted && theme === 'dark' ? (
                <Moon className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              )}
            </button>
            <Link href="/sign-in" className="hover:text-brand-primary transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-brand-primary transition-colors">Create Account</Link>
            <Link href="/dashboard/settings" className="hover:text-brand-primary transition-colors">Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
