import { Link } from 'react-router-dom';
import { InternshipsEmptyIllustration, PlacementsEmptyIllustration } from './StudentDashboardEmptyIllustration';

/**
 * Empty row for student profile internships / placements tables (thead stays visible).
 */
export default function ProfileTableEmpty({ variant, isAdmin, studentId, colSpan }) {
  const isIntern = variant === 'internships';
  const adminCtaTo = isIntern
    ? `/internships/add?student_id=${studentId}`
    : `/placements/add?student_id=${studentId}`;
  const adminCtaLabel = isIntern ? '+ Add Internship' : '+ Add Placement';

  return (
    <tr className="student-profile-table__empty-row">
      <td colSpan={colSpan} className="student-profile-table__empty-cell">
        <div className="student-profile-table__empty">
          <div className="student-profile-table__empty-icon-ring" aria-hidden>
            {isIntern ? <InternshipsEmptyIllustration /> : <PlacementsEmptyIllustration />}
          </div>
          <h3 className="student-profile-table__empty-title">
            {isIntern ? 'No internships logged yet' : 'No placements logged yet'}
          </h3>
          <p className="student-profile-table__empty-sub">
            {isIntern
              ? 'Keep track of your applications and progress here.'
              : 'Record roles, packages, and status as you move through recruiting.'}
          </p>
          {isAdmin ? (
            <Link to={adminCtaTo} className="btn btn-primary btn-sm student-profile-table__empty-cta">
              {adminCtaLabel}
            </Link>
          ) : (
            <div className="student-profile-table__empty-actions">
              <Link
                to="/appeals/new"
                className="btn btn-primary btn-sm student-profile-table__empty-cta"
              >
                <i className="bi bi-plus-lg me-1" aria-hidden />
                {isIntern ? 'New request to company' : 'New placement request'}
              </Link>
              <Link to="/companies" className="btn btn-outline-secondary btn-sm">
                Explore companies
              </Link>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
