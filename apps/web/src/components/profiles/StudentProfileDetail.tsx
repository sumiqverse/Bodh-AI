'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  Card,
  CardHeader,
  CardTitle,
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
import { type StudentProfile, saveUserCustomProfile } from '@/lib/profiles-data';
import {
  Award,
  BookOpen,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Flame,
  HelpCircle,
  Lightbulb,
  Save,
  Share2,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  X,
  XCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface StudentProfileDetailProps {
  readonly profile: StudentProfile;
  readonly onProfileUpdated?: (updated: StudentProfile) => void;
}

export function StudentProfileDetail({
  profile,
  onProfileUpdated: _onProfileUpdated,
}: StudentProfileDetailProps): React.JSX.Element {
  const t = useTranslations('profiles');
  const locale = useLocale();

  const [profileData, setProfileData] = React.useState<StudentProfile>(profile);

  // Sync internal state if live database profile updates asynchronously
  React.useEffect(() => {
    setProfileData(profile);
  }, [profile]);
  const [activeTab, setActiveTab] = React.useState<
    'mastery' | 'errors' | 'hints' | 'trend' | 'activity' | 'badges' | 'plan'
  >('mastery');
  const [skillFilter, setSkillFilter] = React.useState<
    'all' | 'mastered' | 'partial' | 'not_learned'
  >('all');
  const [copiedLink, setCopiedLink] = React.useState<boolean>(false);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);
  const [exportNotice, setExportNotice] = React.useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState<boolean>(false);
  const [savedSuccessNotice, setSavedSuccessNotice] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = React.useState({
    fullName: profile.fullName,
    fullNameHi: profile.fullNameHi || profile.fullName,
    avatarUrl: profile.avatarUrl || '',
    grade: profile.grade || 8,
    section: profile.section || 'A',
    rollNumber: profile.rollNumber || '1',
    schoolName: profile.schoolName || '',
    age: profile.age || 13,
    bio: profile.bio || '',
    bioHi: profile.bioHi || profile.bio || '',
    guardianName: profile.guardianName || '',
    guardianRelation: profile.guardianRelation || 'Parent/Guardian',
  });

  React.useEffect(() => {
    setProfileData(profile);
    setFormData({
      fullName: profile.fullName,
      fullNameHi: profile.fullNameHi || profile.fullName,
      avatarUrl: profile.avatarUrl || '',
      grade: profile.grade || 8,
      section: profile.section || 'A',
      rollNumber: profile.rollNumber || '1',
      schoolName: profile.schoolName || '',
      age: profile.age || 13,
      bio: profile.bio || '',
      bioHi: profile.bioHi || profile.bio || '',
      guardianName: profile.guardianName || '',
      guardianRelation: profile.guardianRelation || 'Parent/Guardian',
    });
  }, [profile]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(
        locale === 'hi'
          ? 'कृपया केवल इमेज (Image) फ़ाइल चुनें।'
          : 'Please select a valid image file.',
      );
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

  const filteredSkills = React.useMemo(() => {
    if (skillFilter === 'all') return profileData.skills;
    return profileData.skills.filter((sk) => sk.state === skillFilter);
  }, [profileData.skills, skillFilter]);

  const handleCopyShareLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/${locale}/profile`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleExportData = () => {
    setIsExporting(true);
    setExportNotice(null);
    setTimeout(() => {
      const exportBlob = new Blob([JSON.stringify(profileData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(exportBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bodhai-student-${profileData.rollNumber}-${profileData.slug}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExporting(false);
      setExportNotice('Telemetry exported successfully (JSON format).');
      setTimeout(() => setExportNotice(null), 3500);
    }, 600);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StudentProfile = {
      ...profileData,
      avatarUrl: formData.avatarUrl,
      fullName: formData.fullName.trim() || profileData.fullName,
      fullNameHi: formData.fullNameHi.trim() || formData.fullName.trim() || profileData.fullNameHi,
      grade: Number(formData.grade) || 8,
      section: formData.section.trim() || 'A',
      rollNumber: formData.rollNumber.trim() || '1',
      schoolName: formData.schoolName.trim() || 'School',
      age: Number(formData.age) || 13,
      bio: formData.bio.trim(),
      bioHi: formData.bioHi.trim() || formData.bio.trim(),
      guardianName: formData.guardianName.trim(),
      guardianRelation: formData.guardianRelation.trim() || 'Parent/Guardian',
    };

    setProfileData(updated);
    saveUserCustomProfile(updated.id, updated);
    setIsEditModalOpen(false);
    setSavedSuccessNotice(
      locale === 'hi'
        ? 'विद्यार्थी प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई है!'
        : 'Student profile updated successfully!',
    );
    setTimeout(() => setSavedSuccessNotice(null), 4000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-6">
      {/* Incomplete profile prompt banner */}
      {(!profileData.bio || !profileData.schoolName) && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {locale === 'hi'
                ? 'अपनी विद्यार्थी प्रोफ़ाइल पूरी करें'
                : 'Complete Your Student Profile'}
            </h4>
            <p className="text-xs text-muted-foreground">
              {locale === 'hi'
                ? 'कृपया अपनी कक्षा, वर्ग, रोल नंबर, विद्यालय और लक्ष्य दर्ज करें।'
                : 'Please add your class, section, school, roll number, and learning goals.'}
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

              {/* Student Identity Information */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                    {locale === 'hi' ? profileData.fullNameHi : profileData.fullName}
                  </h1>
                  <Badge variant="outline" className="font-mono text-xs py-0.5 px-2">
                    {t('rollNo')}: {profileData.rollNumber}
                  </Badge>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs py-0.5 px-2">
                    {t('gradeSection', { grade: profileData.grade, section: profileData.section })}
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    {profileData.schoolName ||
                      (locale === 'hi' ? 'विद्यालय जोड़ें' : 'School Not Set')}
                  </span>
                  {profileData.schoolUdise && (
                    <>
                      <span className="opacity-40">•</span>
                      <span>UDISE: {profileData.schoolUdise}</span>
                    </>
                  )}
                  {profileData.assignedTeacherName && (
                    <>
                      <span className="opacity-40">•</span>
                      <span>
                        {t('assignedTeacher')}:{' '}
                        <span className="font-semibold text-foreground">
                          {profileData.assignedTeacherName}
                        </span>
                      </span>
                    </>
                  )}
                </p>

                <p className="text-xs sm:text-sm text-foreground/90 max-w-2xl pt-1">
                  {locale === 'hi'
                    ? profileData.bioHi || profileData.bio || 'कोई परिचय नहीं जोड़ा गया।'
                    : profileData.bio ||
                      'No bio added yet. Click "Edit Profile" to add your learning goals.'}
                </p>
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
                onClick={handleCopyShareLink}
                className="text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                {copiedLink ? t('copied') : t('shareProfile')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                disabled={isExporting}
                className="text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                {isExporting ? 'Exporting...' : t('exportReport')}
              </Button>
              <Link href="/diagnostic" className="w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('startPractice')}
                </Button>
              </Link>
            </div>
          </div>

          {exportNotice && (
            <div className="mt-4 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium text-center">
              {exportNotice}
            </div>
          )}
        </div>

        {/* 4. Top Telemetry Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-t border-border/50 divide-x divide-y sm:divide-y-0 divide-border/40 bg-muted/10">
          {/* Metric 1: Overall Mastery */}
          <div className="p-4 space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              {t('masteryIndex')}
            </span>
            <div className="text-2xl font-black text-foreground">{profileData.overallMastery}%</div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${profileData.overallMastery}%` }}
              />
            </div>
          </div>

          {/* Metric 2: Streak */}
          <div className="p-4 space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {t('streak')}
            </span>
            <div className="text-2xl font-black text-amber-500 flex items-center justify-center sm:justify-start gap-1">
              {profileData.learningStreakDays}{' '}
              <span className="text-xs font-normal text-muted-foreground">days</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Active practice</span>
          </div>

          {/* Metric 3: Accuracy */}
          <div className="p-4 space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {t('accuracy')}
            </span>
            <div className="text-2xl font-black text-foreground">{profileData.accuracyRate}%</div>
            <span className="text-[10px] text-muted-foreground">First-try accuracy</span>
          </div>

          {/* Metric 4: Questions Solved */}
          <div className="p-4 space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              {t('questionsSolved')}
            </span>
            <div className="text-2xl font-black text-foreground">
              {profileData.totalQuestionsSolved}
            </div>
            <span className="text-[10px] text-muted-foreground">NCERT items</span>
          </div>

          {/* Metric 5: Practice Time */}
          <div className="p-4 space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              {t('practiceHours')}
            </span>
            <div className="text-2xl font-black text-foreground">
              {profileData.practiceHours}{' '}
              <span className="text-xs font-normal text-muted-foreground">hrs</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Total platform time</span>
          </div>

          {/* Metric 6: Independence */}
          <div className="p-4 space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
              <UserCheck className="w-3.5 h-3.5 text-teal-500" />
              Independence
            </span>
            <div className="text-2xl font-black text-foreground">
              {Math.round(profileData.hintUsage?.independenceRatio || 0)}%
            </div>
            <span className="text-[10px] text-muted-foreground">Solved without hints</span>
          </div>
        </div>
      </Card>

      {/* 5. Navigation Tabs */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto pb-px text-xs font-semibold no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('mastery')}
          className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'mastery'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          {t('competencyBreakdown')} ({(profileData.skills || []).length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('errors')}
          className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'errors'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <XCircle className="w-4 h-4 text-destructive" />
          {t('errorDiagnostics')} ({(profileData.errorPatterns || []).length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hints')}
          className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'hints'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-blue-500" />
          {t('hintTelemetry')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trend')}
          className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'trend'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="w-4 h-4 text-indigo-500" />
          {t('masteryTrend')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'activity'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-500" />
          {t('recentActivity')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('badges')}
          className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'badges'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" />
          {t('achievements')} ({(profileData.badges || []).length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plan')}
          className={`pb-3 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'plan'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          {t('recommendedPlan')}
        </button>
      </div>

      {/* TAB 1: COMPETENCY & SKILL MATRIX */}
      {activeTab === 'mastery' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Filter by state:</span>
              <div className="flex gap-1.5">
                {(['all', 'mastered', 'partial', 'not_learned'] as const).map((st) => (
                  <Button
                    key={st}
                    variant={skillFilter === st ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSkillFilter(st)}
                    className="text-xs capitalize py-1 px-2.5 h-7"
                  >
                    {st === 'all'
                      ? 'All Skills'
                      : st === 'mastered'
                        ? 'Mastered'
                        : st === 'partial'
                          ? 'In Progress'
                          : 'Needs Review'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Showing {filteredSkills.length} of {(profileData.skills || []).length} competencies
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold">Competency Code & Name</TableHead>
                  <TableHead className="text-xs font-bold">Chapter / Topic</TableHead>
                  <TableHead className="text-xs font-bold text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold text-right">Mastery P(M)</TableHead>
                  <TableHead className="text-xs font-bold text-center">Attempts</TableHead>
                  <TableHead className="text-xs font-bold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSkills.map((sk) => (
                  <TableRow key={sk.skillId} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3">
                      <div className="font-semibold text-xs text-foreground">{sk.skillName}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {sk.skillCode}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{sk.topicName}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          sk.state === 'mastered'
                            ? 'default'
                            : sk.state === 'partial'
                              ? 'warning'
                              : 'outline'
                        }
                        size="sm"
                        className="text-[11px] font-semibold py-0.5 px-2"
                      >
                        {sk.state === 'mastered'
                          ? '✓ Mastered'
                          : sk.state === 'partial'
                            ? '◐ In Progress'
                            : '○ Needs Attention'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              sk.pMastery >= 0.8
                                ? 'bg-emerald-500'
                                : sk.pMastery >= 0.5
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.round(sk.pMastery * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold">
                          {Math.round(sk.pMastery * 100)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {sk.attemptsCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/solve?skill=${sk.skillCode}`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7 px-2 font-medium">
                          Practice
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* TAB 2: ERROR DIAGNOSTICS & MISCONCEPTIONS (UNIQUE PER STUDENT) */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-1">
            <h3 className="text-sm font-bold text-destructive flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Individualized Cognitive Error Profile
            </h3>
            <p className="text-xs text-muted-foreground">
              These misconceptions are unique to {profileData.fullName} based on recurring
              distractor patterns observed during recent diagnostic assessments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(profileData.errorPatterns || []).map((err, idx) => (
              <Card
                key={idx}
                className="border border-destructive/20 hover:border-destructive/40 transition-colors shadow-xs"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="destructive" className="font-mono text-[11px]">
                      {err.questionCode}
                    </Badge>
                    <span className="text-xs font-bold text-destructive">
                      {err.count} {err.count === 1 ? 'occurrence' : 'occurrences'}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground pt-1">
                    &ldquo;{err.promptExcerpt}&rdquo;
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground block text-[11px]">
                      {t('distractorSelected')}:
                    </span>
                    <span className="font-medium text-foreground bg-muted/40 p-1.5 rounded block mt-0.5 font-mono text-[11px]">
                      {err.distractorChosen}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-muted-foreground block text-[11px]">
                      {t('misconceptionIdentified')}:
                    </span>
                    <p className="text-foreground/90 mt-0.5 leading-relaxed">{err.misconception}</p>
                  </div>

                  <div className="pt-2 border-t border-border/50">
                    <span className="font-semibold text-primary block text-[11px] flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5" />
                      {t('recommendedRemedy')}:
                    </span>
                    <p className="text-xs text-foreground/80 mt-0.5">{err.remedyAction}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HINT LADDER TELEMETRY */}
      {activeTab === 'hints' && (
        <div className="space-y-6">
          <Card className="p-6 border border-border shadow-xs">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              Scaffolded Assistance Ladder Breakdown
            </h3>

            {/* Visual Segmented Bar */}
            <div className="space-y-2">
              <div className="h-6 w-full rounded-lg overflow-hidden flex bg-muted font-mono text-[10px] font-bold text-white">
                <div
                  style={{
                    width: `${((profileData.hintUsage?.independentAttemptsCount || 0) / Math.max(1, (profileData.hintUsage?.independentAttemptsCount || 0) + (profileData.hintUsage?.totalHintsRequested || 0))) * 100}%`,
                  }}
                  className="bg-emerald-600 flex items-center justify-center transition-all"
                  title="Independent Solutions"
                >
                  {profileData.hintUsage?.independentAttemptsCount || 0}
                </div>
                <div
                  style={{
                    width: `${((profileData.hintUsage?.hint1Count || 0) / Math.max(1, (profileData.hintUsage?.independentAttemptsCount || 0) + (profileData.hintUsage?.totalHintsRequested || 0))) * 100}%`,
                  }}
                  className="bg-blue-600 flex items-center justify-center transition-all"
                  title="Level 1 Hints"
                >
                  {profileData.hintUsage?.hint1Count || 0}
                </div>
                <div
                  style={{
                    width: `${((profileData.hintUsage?.hint2Count || 0) / Math.max(1, (profileData.hintUsage?.independentAttemptsCount || 0) + (profileData.hintUsage?.totalHintsRequested || 0))) * 100}%`,
                  }}
                  className="bg-amber-600 flex items-center justify-center transition-all"
                  title="Level 2 Hints"
                >
                  {profileData.hintUsage?.hint2Count || 0}
                </div>
                <div
                  style={{
                    width: `${((profileData.hintUsage?.hint3Count || 0) / Math.max(1, (profileData.hintUsage?.independentAttemptsCount || 0) + (profileData.hintUsage?.totalHintsRequested || 0))) * 100}%`,
                  }}
                  className="bg-purple-600 flex items-center justify-center transition-all"
                  title="Level 3 Hints"
                >
                  {profileData.hintUsage?.hint3Count || 0}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block">
                    Independent (No Hints)
                  </span>
                  <div className="text-xl font-black text-foreground">
                    {profileData.hintUsage?.independentAttemptsCount || 0}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    {Math.round(profileData.hintUsage?.independenceRatio || 0)}% of solutions
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-1">
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 block">
                    Hint 1: Conceptual Nudge
                  </span>
                  <div className="text-xl font-black text-foreground">
                    {profileData.hintUsage?.hint1Count || 0}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Gentle reminder prompts
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-1">
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 block">
                    Hint 2: Formula Scaffold
                  </span>
                  <div className="text-xl font-black text-foreground">
                    {profileData.hintUsage?.hint2Count || 0}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Structural formula steps
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5 space-y-1">
                  <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 block">
                    Hint 3: Worked Sub-Step
                  </span>
                  <div className="text-xl font-black text-foreground">
                    {profileData.hintUsage?.hint3Count || 0}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Complete micro-resolution
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: MASTERY TREND & TRAJECTORY */}
      {activeTab === 'trend' && (
        <div className="space-y-4">
          <Card className="p-6 border border-border shadow-xs">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Longitudinal Competency Progression (Last 5 Weeks)
            </h3>

            <div className="space-y-3">
              {(profileData.trend || []).map((pt, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs text-foreground w-16">{pt.date}</span>
                    <div className="w-32 sm:w-48 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${Math.round(pt.pMastery * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="font-mono font-bold text-primary">
                      {Math.round(pt.pMastery * 100)}% Mastery
                    </span>
                    <span className="text-muted-foreground hidden sm:inline">
                      {pt.attempts} questions
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {pt.accuracy}% Accuracy
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: RECENT PRACTICE LOG */}
      {activeTab === 'activity' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold">Item Prompt</TableHead>
                  <TableHead className="text-xs font-bold">Topic</TableHead>
                  <TableHead className="text-xs font-bold text-center">Result</TableHead>
                  <TableHead className="text-xs font-bold text-center">Time Spent</TableHead>
                  <TableHead className="text-xs font-bold text-center">Hints Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(profileData.recentActivities || []).map((act) => (
                  <TableRow key={act.id}>
                    <TableCell className="text-xs font-medium">
                      <div className="text-foreground">{act.prompt}</div>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {act.questionCode}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{act.topic}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={act.isCorrect ? 'default' : 'destructive'}
                        className="text-[10px] py-0 px-2"
                      >
                        {act.isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {act.timeSpentSeconds}s
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {act.hintsUsed === 0 ? 'None (Independent)' : `${act.hintsUsed} Hint(s)`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* TAB 6: BADGES & ACHIEVEMENTS */}
      {activeTab === 'badges' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(profileData.badges || []).map((bdg) => (
            <Card
              key={bdg.id}
              className="border border-border/80 p-5 space-y-3 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="text-3xl">{bdg.icon}</div>
                <Badge variant="outline" className={`text-[10px] ${bdg.color}`}>
                  {bdg.category.toUpperCase()}
                </Badge>
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {locale === 'hi' ? bdg.titleHi : bdg.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {bdg.description}
                </p>
              </div>
              <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                Unlocked: {bdg.unlockedAt}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 7: PERSONALIZED ACTION PLAN */}
      {activeTab === 'plan' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Tailored Adaptive Practice Pathway
            </h3>
            <p className="text-xs text-muted-foreground">
              Generated by BodhAI based on {profileData.fullName}&apos;s diagnostic signals, error
              patterns, and prerequisite graph.
            </p>
          </div>

          <div className="space-y-3">
            {(profileData.recommendedSteps || []).map((stp, idx) => (
              <Card
                key={stp.id}
                className="p-4 border border-border/80 hover:border-primary/40 transition-colors shadow-xs"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-foreground">{stp.skillName}</h4>
                      <Badge
                        variant={
                          stp.type === 'remedial'
                            ? 'destructive'
                            : stp.type === 'mastery_gate'
                              ? 'default'
                              : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {stp.type.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground pl-8">{stp.reason}</p>
                  </div>

                  <div className="flex items-center gap-3 pl-8 sm:pl-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />~{stp.estimatedMinutes} mins
                    </span>
                    <Link href={`/solve?skill=${stp.skillCode}`}>
                      <Button variant="primary" size="sm" className="text-xs font-bold gap-1">
                        Start
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 6. Edit Student Profile Modal Dialog */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-floating overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20 shrink-0">
              <div className="space-y-0.5">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" />
                  {locale === 'hi' ? 'विद्यार्थी प्रोफ़ाइल संपादित करें' : 'Edit Student Profile'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {locale === 'hi'
                    ? 'अपना नाम, कक्षा, रोल नंबर, विद्यालय और लक्ष्य अपडेट करें।'
                    : 'Update your name, class, section, roll number, school, and learning goals.'}
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
            <form
              onSubmit={handleSaveProfile}
              className="p-6 space-y-4 overflow-y-auto flex-1 text-left"
            >
              {/* Photo Upload Section */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-border/80 bg-muted/20">
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-700 flex items-center justify-center text-white text-2xl font-black shadow-md overflow-hidden shrink-0 ring-2 ring-border">
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(formData.fullName || 'S').charAt(0)}</span>
                  )}
                </div>

                <div className="space-y-1.5 flex-1 text-center sm:text-left">
                  <div className="text-xs font-bold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-primary" />
                    {locale === 'hi' ? 'विद्यार्थी प्रोफ़ाइल फ़ोटो' : 'Student Profile Photo'}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {locale === 'hi'
                      ? 'अपनी फ़ोटो या स्कूल आईडी तस्वीर अपलोड करें (JPG, PNG, WebP)'
                      : 'Upload your student portrait or school ID photograph (JPG, PNG, WebP)'}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="student-photo-upload"
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
                    placeholder="e.g. Aarav Sharma"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'पूरा नाम (हिन्दी में)' : 'Full Name (Hindi)'}
                  </label>
                  <Input
                    placeholder="e.g. आरव शर्मा"
                    value={formData.fullNameHi}
                    onChange={(e) => setFormData({ ...formData, fullNameHi: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'कक्षा (Grade / Class)' : 'Grade / Class'} *
                  </label>
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
                  >
                    {[6, 7, 8, 9, 10].map((gr) => (
                      <option key={gr} value={gr}>
                        Class {gr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'वर्ग (Section)' : 'Section'} *
                  </label>
                  <Input
                    required
                    placeholder="e.g. A"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'रोल नंबर (Roll No)' : 'Roll Number'} *
                  </label>
                  <Input
                    required
                    placeholder="e.g. 101"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'विद्यालय का नाम (School Name)' : 'School Name'} *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Govt. Model Senior Secondary School"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'आयु (Age in years)' : 'Age'}
                  </label>
                  <Input
                    type="number"
                    min="8"
                    max="22"
                    placeholder="e.g. 13"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {locale === 'hi' ? 'लक्ष्य एवं परिचय (Bio / Goals)' : 'Bio / Learning Goals'} *
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none leading-relaxed"
                  placeholder="Tell us about your learning goals, favourite subjects, and areas you want to master..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'अभिभावक का नाम (Guardian Name)' : 'Guardian Name'}
                  </label>
                  <Input
                    placeholder="e.g. Mr. Sunil Sharma"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {locale === 'hi' ? 'संबंध (Relationship)' : 'Guardian Relation'}
                  </label>
                  <Input
                    placeholder="e.g. Father, Mother, Guardian"
                    value={formData.guardianRelation}
                    onChange={(e) => setFormData({ ...formData, guardianRelation: e.target.value })}
                  />
                </div>
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
