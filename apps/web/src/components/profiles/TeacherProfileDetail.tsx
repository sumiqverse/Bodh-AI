'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@bodhai/ui';
import { type TeacherProfile, saveUserCustomProfile } from '@/lib/profiles-data';
import {
  Award,
  BookOpen,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  FileCheck,
  GraduationCap,
  Mail,
  Phone,
  Save,
  Share2,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  X,
} from 'lucide-react';

interface TeacherProfileDetailProps {
  readonly profile: TeacherProfile;
}

export function TeacherProfileDetail({ profile }: TeacherProfileDetailProps): React.JSX.Element {
  const t = useTranslations('profiles');
  const locale = useLocale();

  const [profileData, setProfileData] = React.useState<TeacherProfile>(profile);
  const [activeTab, setActiveTab] = React.useState<'classes' | 'decisions' | 'schedule' | 'specializations'>(
    'classes',
  );
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
  const [copiedProfileLink, setCopiedProfileLink] = React.useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState<boolean>(false);
  const [savedSuccessNotice, setSavedSuccessNotice] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Edit form state
  const [formData, setFormData] = React.useState({
    fullName: profile.fullName,
    fullNameHi: profile.fullNameHi || profile.fullName,
    employeeId: profile.employeeId || '',
    avatarUrl: profile.avatarUrl || '',
    title: profile.title,
    titleHi: profile.titleHi || profile.title,
    experienceYears: profile.experienceYears || 0,
    schoolName: profile.schoolName || '',
    department: profile.department || '',
    qualifications: profile.qualifications || '',
    bio: profile.bio || '',
    bioHi: profile.bioHi || profile.bio || '',
    phone: profile.phone || '',
    officeHours: profile.officeHours || '',
    specializations: (profile.specializations || []).join(', '),
  });

  // Sync if prop changes
  React.useEffect(() => {
    setProfileData(profile);
    setFormData({
      fullName: profile.fullName,
      fullNameHi: profile.fullNameHi || profile.fullName,
      employeeId: profile.employeeId || '',
      avatarUrl: profile.avatarUrl || '',
      title: profile.title,
      titleHi: profile.titleHi || profile.title,
      experienceYears: profile.experienceYears || 0,
      schoolName: profile.schoolName || '',
      department: profile.department || '',
      qualifications: profile.qualifications || '',
      bio: profile.bio || '',
      bioHi: profile.bioHi || profile.bio || '',
      phone: profile.phone || '',
      officeHours: profile.officeHours || '',
      specializations: (profile.specializations || []).join(', '),
    });
  }, [profile]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(locale === 'hi' ? 'कृपया केवल इमेज (Image) फ़ाइल चुनें।' : 'Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 360;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setFormData((prev) => ({ ...prev, avatarUrl: compressedDataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCopyCode = (code: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  const handleCopyProfileLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/${locale}/profile`;
      navigator.clipboard.writeText(url);
      setCopiedProfileLink(true);
      setTimeout(() => setCopiedProfileLink(false), 2500);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: TeacherProfile = {
      ...profileData,
      employeeId: formData.employeeId.trim() || profileData.employeeId,
      avatarUrl: formData.avatarUrl,
      fullName: formData.fullName.trim() || profileData.fullName,
      fullNameHi: formData.fullNameHi.trim() || formData.fullName.trim() || profileData.fullNameHi,
      title: formData.title.trim() || 'Educator',
      titleHi: formData.titleHi.trim() || formData.title.trim() || 'शिक्षक',
      experienceYears: Number(formData.experienceYears) || 0,
      schoolName: formData.schoolName.trim() || 'School',
      department: formData.department.trim() || 'Secondary Department',
      qualifications: formData.qualifications.trim() || 'B.Ed / Degree',
      bio: formData.bio.trim(),
      bioHi: formData.bioHi.trim() || formData.bio.trim(),
      phone: formData.phone.trim(),
      officeHours: formData.officeHours.trim() || 'Monday – Friday, 2:00 PM – 4:00 PM',
      specializations: formData.specializations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    setProfileData(updated);
    saveUserCustomProfile(updated.id, updated);
    setIsEditModalOpen(false);
    setSavedSuccessNotice(
      locale === 'hi'
        ? 'आपकी प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई है!'
        : 'Your educator profile has been updated successfully!',
    );
    setTimeout(() => setSavedSuccessNotice(null), 4000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-6">
      {/* Incomplete profile prompt banner */}
      {(!profileData.bio || profileData.experienceYears === 0 || !profileData.schoolName) && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {locale === 'hi' ? 'अपनी प्रोफ़ाइल पूरी करें' : 'Complete Your Educator Profile'}
            </h4>
            <p className="text-xs text-muted-foreground">
              {locale === 'hi'
                ? 'कृपया अपना नाम, कार्य अनुभव (Years of Experience), परिचय (Bio), विद्यालय और अन्य विवरण भरें।'
                : 'Please add your teaching experience, school, bio, and subjects so your profile is authentic.'}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs font-bold gap-1.5 whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {locale === 'hi' ? 'विवरण भरें' : 'Set Up Profile Now'}
          </Button>
        </div>
      )}

      {/* Success Notice */}
      {savedSuccessNotice && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 shadow-xs">
          <Check className="w-4 h-4 shrink-0" />
          <span>{savedSuccessNotice}</span>
        </div>
      )}

      {/* Hero Identity Card */}
      <Card className="overflow-hidden border border-border/60 shadow-md">
        <div className="relative p-6 sm:p-8 bg-gradient-to-br from-card via-background to-muted/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar with Photo or Glow */}
              <div
                className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr ${profileData.avatarGradient} flex items-center justify-center text-white text-3xl font-black shadow-lg ring-4 ring-background overflow-hidden group shrink-0`}
              >
                {profileData.avatarUrl ? (
                  <img
                    src={profileData.avatarUrl}
                    alt={profileData.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{profileData.fullName.charAt(0)}</span>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer"
                  title={locale === 'hi' ? 'फ़ोटो बदलें' : 'Change Photo'}
                >
                  <Camera className="w-5 h-5 mb-0.5 text-white" />
                  <span>{locale === 'hi' ? 'फ़ोटो' : 'Photo'}</span>
                </button>
              </div>

              {/* Teacher Identity Information */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                    {locale === 'hi' ? profileData.fullNameHi : profileData.fullName}
                  </h1>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs py-0.5 px-2">
                    {profileData.experienceYears} Years Exp
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-primary">
                  {locale === 'hi' ? profileData.titleHi : profileData.title}
                </p>

                <p className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{profileData.schoolName || (locale === 'hi' ? 'विद्यालय जोड़ें' : 'School Not Set')}</span>
                  <span className="opacity-40">•</span>
                  <span>{profileData.department}</span>
                  {profileData.qualifications && (
                    <>
                      <span className="opacity-40">•</span>
                      <span>{profileData.qualifications}</span>
                    </>
                  )}
                </p>

                <p className="text-xs sm:text-sm text-foreground/90 max-w-2xl pt-1">
                  {locale === 'hi'
                    ? profileData.bioHi || profileData.bio || 'कोई परिचय नहीं जोड़ा गया।'
                    : profileData.bio || 'No bio added yet. Click "Edit Profile" to add your teaching statement.'}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                  {profileData.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      {profileData.email}
                    </span>
                  )}
                  {profileData.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      {profileData.phone}
                    </span>
                  )}
                  {profileData.officeHours && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {profileData.officeHours}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap sm:flex-col gap-2 w-full sm:w-auto self-stretch sm:self-center justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs font-bold gap-1.5 shadow-sm bg-primary hover:bg-primary/90 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {locale === 'hi' ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyProfileLink}
                className="text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                {copiedProfileLink ? t('copied') : t('shareProfile')}
              </Button>
              <Link href="/classes" className="w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold gap-1.5 shadow-xs"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Classroom Hub
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Top Telemetry Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-5 border-t border-border/50 divide-x divide-y sm:divide-y-0 divide-border/40 bg-muted/10">
          <div className="p-4 space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
              <Users className="w-3.5 h-3.5 text-primary" />
              {t('studentsTaught')}
            </span>
            <div className="text-2xl font-black text-foreground">
              {profileData.totalStudentsTaught}
            </div>
            <span className="text-[10px] text-muted-foreground">Active learners</span>
          </div>

          <div className="p-4 space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
              {t('activeClasses')}
            </span>
            <div className="text-2xl font-black text-foreground">
              {profileData.activeClassesCount}
            </div>
            <span className="text-[10px] text-muted-foreground">Classroom sections</span>
          </div>

          <div className="p-4 space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              {t('avgMastery')}
            </span>
            <div className="text-2xl font-black text-foreground">
              {profileData.avgClassroomMastery}%
            </div>
            <span className="text-[10px] text-muted-foreground">Classroom cohort avg</span>
          </div>

          <div className="p-4 space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
              <FileCheck className="w-3.5 h-3.5 text-amber-500" />
              Assignments
            </span>
            <div className="text-2xl font-black text-foreground">
              {profileData.totalAssignmentsCreated}
            </div>
            <span className="text-[10px] text-muted-foreground">Curated practice sets</span>
          </div>

          <div className="p-4 space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              {t('aiReviewed')}
            </span>
            <div className="text-2xl font-black text-foreground">
              {profileData.aiDecisionsReviewed}
            </div>
            <span className="text-[10px] text-muted-foreground">Pedagogical interventions</span>
          </div>
        </div>
      </Card>

      {/* 5. Navigation Tabs */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto pb-px text-xs font-semibold no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'classes'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          {t('classesManaged')} ({(profileData.classes || []).length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('decisions')}
          className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'decisions'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-500" />
          {t('pedagogicalDecisions')} ({(profileData.pedagogicalDecisions || []).length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="w-4 h-4 text-blue-500" />
          {t('teacherSchedule')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('specializations')}
          className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'specializations'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" />
          {t('specializations')}
        </button>
      </div>

      {/* TAB 1: CLASSES MANAGED */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(profileData.classes || []).map((cls) => (
            <Card key={cls.id} className="border border-border/80 shadow-xs hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    Class {cls.grade}-{cls.section}
                  </Badge>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <CardTitle className="text-base font-bold text-foreground pt-1">
                  {cls.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  Academic Year: {cls.academicYear}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Students:</span>
                    <span className="text-base font-bold text-foreground">
                      {cls.studentCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Avg Mastery:</span>
                    <span className="text-base font-bold text-primary">
                      {cls.avgMastery}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground text-[11px]">Join Code:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-xs bg-muted px-2 py-1 rounded">
                    <span>{cls.joinCode}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(cls.joinCode)}
                      className="text-primary hover:text-primary/80 transition-colors cursor-pointer text-[10px]"
                    >
                      {copiedCode === cls.joinCode ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40">
                  <Link href={`/classes/${cls.id}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
                      Open Class Dashboard & Heatmap
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 2: PEDAGOGICAL DECISIONS */}
      {activeTab === 'decisions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Teacher Governance & Advisory Engine Decisions
            </h3>
            <p className="text-xs text-muted-foreground">
              BodhAI AI recommendations are strictly advisory. All intervention allocations and custom revision pathways are governed by verified educator decisions.
            </p>
          </div>

          <div className="space-y-3">
            {(profileData.pedagogicalDecisions || []).map((dec) => (
              <Card key={dec.id} className="p-4 border border-border/80 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={dec.action === 'accepted' ? 'default' : 'warning'}
                        className="text-[10px] uppercase font-bold"
                      >
                        {dec.action}
                      </Badge>
                      <span className="font-bold text-xs text-foreground font-mono">
                        {dec.className}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs font-semibold text-primary">
                        {dec.skillName}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-foreground">
                      {dec.suggestionTitle}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Rationale: {dec.rationale}
                    </p>
                  </div>

                  <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                    {new Date(dec.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-bold">Day</TableHead>
                <TableHead className="text-xs font-bold">Period & Time</TableHead>
                <TableHead className="text-xs font-bold">Class Section</TableHead>
                <TableHead className="text-xs font-bold">Subject / Unit</TableHead>
                <TableHead className="text-xs font-bold text-right">Classroom</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(profileData.schedule || []).map((slot, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-bold text-xs text-primary">
                    {slot.day}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    <span className="font-semibold block">{slot.period}</span>
                    <span className="text-[11px] text-muted-foreground">{slot.timeSlot}</span>
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {slot.className}
                  </TableCell>
                  <TableCell className="text-xs">
                    {slot.subject}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono text-muted-foreground">
                    {slot.room}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* TAB 4: SPECIALIZATIONS */}
      {activeTab === 'specializations' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(profileData.specializations || []).map((spec, idx) => (
            <Card key={idx} className="p-4 border border-border/80 flex items-start gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">{spec}</h4>
                <p className="text-xs text-muted-foreground">
                  Aligned with NCERT Class 6–10 guidelines and national foundational literacy and numeracy standards.
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 6. Edit Profile Modal Dialog */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-floating overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20 shrink-0">
              <div className="space-y-0.5">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" />
                  {locale === 'hi' ? 'शिक्षक प्रोफ़ाइल संपादित करें' : 'Edit Educator Profile'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {locale === 'hi'
                    ? 'अपना नाम, कार्य अनुभव, विद्यालय, परिचय (Bio) और अन्य विवरण अपडेट करें।'
                    : 'Update your name, work experience, bio, school, and institutional details.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              {/* Photo Upload Section */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-border/80 bg-muted/20">
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-800 flex items-center justify-center text-white text-2xl font-black shadow-md overflow-hidden shrink-0 ring-2 ring-border">
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(formData.fullName || 'T').charAt(0)}</span>
                  )}
                </div>

                <div className="space-y-1.5 flex-1 text-center sm:text-left">
                  <div className="text-xs font-bold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-primary" />
                    {locale === 'hi' ? 'शिक्षक प्रोफ़ाइल फ़ोटो' : 'Educator Profile Photo'}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {locale === 'hi'
                      ? 'अपनी प्रोफ़ाइल तस्वीर या स्कूल आईडी फ़ोटो अपलोड करें (JPG, PNG, WebP)'
                      : 'Upload your teacher photograph or identity portrait (JPG, PNG, WebP)'}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="teacher-photo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold gap-1.5 h-8 px-3 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-primary" />
                      {formData.avatarUrl
                        ? locale === 'hi'
                          ? 'फ़ोटो बदलें'
                          : 'Change Photo'
                        : locale === 'hi'
                          ? 'फ़ोटो अपलोड करें'
                          : 'Upload Photo'}
                    </Button>

                    {formData.avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, avatarUrl: '' })}
                        className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2.5 cursor-pointer gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {locale === 'hi' ? 'हटाएं' : 'Remove'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'पूरा नाम (Full Name)' : 'Full Name (English)'} *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Mr. Rajesh Kumar"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'पूरा नाम (हिन्दी में)' : 'Full Name (Hindi)'}
                  </label>
                  <Input
                    placeholder="e.g. श्री राजेश कुमार"
                    value={formData.fullNameHi}
                    onChange={(e) => setFormData({ ...formData, fullNameHi: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {locale === 'hi' ? 'पद / विषय (Designation / Title)' : 'Professional Title / Designation'} *
                </label>
                <Input
                  required
                  placeholder="e.g. Senior Mathematics Educator & Department Head"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'कार्य अनुभव (Years of Experience)' : 'Teaching Experience (Years)'} *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    required
                    placeholder="e.g. 14"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'विद्यालय का नाम (School Name)' : 'School Name'} *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Govt. Model Senior Secondary School, Delhi"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'विभाग / कक्षाएँ (Department / Classes)' : 'Department / Subject Area'}
                  </label>
                  <Input
                    placeholder="e.g. Secondary Mathematics (Classes 8–10)"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'शैक्षणिक योग्यता (Qualifications)' : 'Educational Qualifications'}
                  </label>
                  <Input
                    placeholder="e.g. M.Sc. Mathematics, B.Ed. (Delhi University)"
                    value={formData.qualifications}
                    onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {locale === 'hi' ? 'परिचय एवं शिक्षण दृष्टिकोण (Bio / Teaching Statement)' : 'Bio / Teaching Philosophy'} *
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none leading-relaxed"
                  placeholder="Share a short bio about your pedagogical vision, teaching style, and focus areas..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'फ़ोन नंबर (Phone Number)' : 'Contact Phone'}
                  </label>
                  <Input
                    placeholder="e.g. +91 98112 34567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'परामर्श समय (Office Hours)' : 'Office Hours / Availability'}
                  </label>
                  <Input
                    placeholder="e.g. Monday, Wednesday, Friday: 2:30 PM – 4:00 PM"
                    value={formData.officeHours}
                    onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {locale === 'hi' ? 'विशेषज्ञता के क्षेत्र (कॉमा से अलग करें)' : 'Areas of Specialization (comma-separated)'}
                </label>
                <Input
                  placeholder="e.g. Algebra, Geometry, CBSE Board Prep, Remedial Pedagogy"
                  value={formData.specializations}
                  onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-xs font-semibold"
                >
                  {locale === 'hi' ? 'रद्द करें' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="text-xs font-bold gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  {locale === 'hi' ? 'बदलाव सहेजें' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
