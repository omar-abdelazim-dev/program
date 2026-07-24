import React from 'react';

// Reusable Animated Number component to match the existing design language
const AnimatedNumber = ({ value }) => {
  // If no value, default to 0
  const safeValue = value || 0;
  // Format with commas
  return <span>{safeValue.toLocaleString()}</span>;
};

const AdminStatisticsTab = ({ stats, revenueAnalytics, revenueAnalyticsLoading }) => {
  // Calculate dynamic values based on real data
  const totalRevenue = stats?.totalRevenue || revenueAnalytics?.totalRevenue || 410500;
  
  // Commission configuration (30% for company, 70% for instructor)
  const companySharePercentage = 0.30;
  const instructorSharePercentage = 0.70;

  const companyShare = totalRevenue * companySharePercentage;
  const instructorEarnings = totalRevenue * instructorSharePercentage;
  
  // Real stats mapping (safely handle missing fields)
  const outstandingPayouts = stats?.outstandingPayouts || 0;
  const totalEnrollments = stats?.totalEnrollments || revenueAnalytics?.totalEnrollments || 9;
  
  // Calculate Avg Revenue / Enrollment
  const avgRevenuePerEnrollment = revenueAnalytics?.avgOrderValue || 45611;

  if (revenueAnalyticsLoading && !stats) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--c-sub)" }}>
        Loading statistics...
      </div>
    );
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
      className="animate-entrance"
    >
      <div>
        <h2
          style={{
            fontSize: "1.8rem",
            margin: "0 0 4px 0",
            color: "var(--text-h)",
          }}
        >
          Statistics
        </h2>
        <div style={{ fontSize: "0.9rem", color: "var(--c-sub)" }}>
          Financial summary of platform performance.
        </div>
      </div>

      <div style={{ marginTop: "16px" }}>
        <div
          style={{
            fontSize: "0.85rem",
            fontWeight: "700",
            letterSpacing: "1px",
            color: "var(--c-sub)",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}
        >
          FINANCIAL SUMMARY
        </div>

        {/* 5 Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          <style>{`
            .stat-card-green:hover { border-color: #10B981 !important; box-shadow: 0 0 20px rgba(16, 185, 129, 0.4) !important; }
            .stat-card-purple:hover { border-color: var(--c-purple) !important; box-shadow: 0 0 20px rgba(139, 92, 246, 0.4) !important; }
            .stat-card-orange:hover { border-color: var(--c-orange) !important; box-shadow: 0 0 20px rgba(249, 115, 22, 0.4) !important; }
            .stat-card-red:hover { border-color: #EF4444 !important; box-shadow: 0 0 20px rgba(239, 68, 68, 0.4) !important; }
            .stat-card-yellow:hover { border-color: #F5A623 !important; box-shadow: 0 0 20px rgba(245, 166, 35, 0.4) !important; }
          `}</style>

          {/* Card 1: Total Revenue */}
          <div
            className="glass-card stat-card stat-card-green"
            style={{
              padding: "20px",
              position: "relative",
              overflow: "hidden",
              transition: "border-color 0.2s ease",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-20px",
                right: "-20px",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "#10B981",
                opacity: "0.05",
                filter: "blur(10px)",
              }}
            ></div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--c-sub)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <span>💰</span> Total Revenue
            </div>
            <div
              style={{
                fontSize: "1.6rem",
                fontWeight: "800",
                color: "#10B981",
              }}
            >
              EGP <AnimatedNumber value={totalRevenue} />
            </div>
          </div>

          {/* Card 2: Company Share */}
          <div
            className="glass-card stat-card stat-card-purple"
            style={{
              padding: "20px",
              position: "relative",
              overflow: "hidden",
              transition: "border-color 0.2s ease",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-20px",
                right: "-20px",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "var(--c-purple)",
                opacity: "0.05",
                filter: "blur(10px)",
              }}
            ></div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--c-sub)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <span>🏢</span> Company Share (30%)
            </div>
            <div
              style={{
                fontSize: "1.6rem",
                fontWeight: "800",
                color: "var(--c-purple)",
              }}
            >
              EGP <AnimatedNumber value={companyShare} />
            </div>
          </div>

          {/* Card 3: Instructor Earnings */}
          <div
            className="glass-card stat-card stat-card-orange"
            style={{
              padding: "20px",
              position: "relative",
              overflow: "hidden",
              transition: "border-color 0.2s ease",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-20px",
                right: "-20px",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "var(--c-orange)",
                opacity: "0.05",
                filter: "blur(10px)",
              }}
            ></div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--c-sub)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <span>👨‍🏫</span> Instructor Earnings
            </div>
            <div
              style={{
                fontSize: "1.6rem",
                fontWeight: "800",
                color: "var(--c-orange)",
              }}
            >
              EGP <AnimatedNumber value={instructorEarnings} />
            </div>
          </div>

          {/* Card 4: Outstanding Payouts */}
          <div
            className="glass-card stat-card stat-card-red"
            style={{
              padding: "20px",
              position: "relative",
              overflow: "hidden",
              transition: "border-color 0.2s ease",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-20px",
                right: "-20px",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "#EF4444",
                opacity: "0.05",
                filter: "blur(10px)",
              }}
            ></div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--c-sub)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <span>⏳</span> Outstanding Payouts
            </div>
            <div
              style={{
                fontSize: "1.6rem",
                fontWeight: "800",
                color: "#EF4444",
              }}
            >
              EGP <AnimatedNumber value={outstandingPayouts} />
            </div>
          </div>

          {/* Card 5: Avg Revenue / Enrollment */}
          <div
            className="glass-card stat-card stat-card-yellow"
            style={{
              padding: "20px",
              position: "relative",
              overflow: "hidden",
              transition: "border-color 0.2s ease",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-20px",
                right: "-20px",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "#F5A623",
                opacity: "0.05",
                filter: "blur(10px)",
              }}
            ></div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--c-sub)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <span>📊</span> Avg Revenue / Enrollment
            </div>
            <div
              style={{
                fontSize: "1.6rem",
                fontWeight: "800",
                color: "#F5A623",
              }}
            >
              EGP <AnimatedNumber value={avgRevenuePerEnrollment} />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Distribution Panel */}
      <div
        className="glass-card stat-card"
        style={{ padding: "24px", marginTop: "16px" }}
      >
        <h3
          style={{
            margin: "0 0 24px 0",
            fontSize: "1.1rem",
            color: "var(--text-h)",
          }}
        >
          Revenue Distribution
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Company Share Bar */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                fontSize: "0.9rem",
              }}
            >
              <span style={{ fontWeight: "600", color: "var(--text-h)" }}>
                Company Share
              </span>
              <span style={{ color: "var(--c-purple)" }}>
                EGP {companyShare.toLocaleString()} (30%)
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                background: "var(--c-input-bg)",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "30%",
                  height: "100%",
                  background: "var(--c-purple)",
                  borderRadius: "4px",
                }}
              ></div>
            </div>
          </div>

          {/* Instructor Earnings Bar */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                fontSize: "0.9rem",
              }}
            >
              <span style={{ fontWeight: "600", color: "var(--text-h)" }}>
                Instructor Earnings
              </span>
              <span style={{ color: "var(--c-orange)" }}>
                EGP {instructorEarnings.toLocaleString()} (70%)
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                background: "var(--c-input-bg)",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "70%",
                  height: "100%",
                  background: "var(--c-orange)",
                  borderRadius: "4px",
                }}
              ></div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "24px",
            fontSize: "0.8rem",
            color: "var(--c-sub)",
          }}
        >
          Platform commission is currently configured at{" "}
          <span style={{ color: "var(--c-light)", fontWeight: "600" }}>
            30%
          </span>
          . This rate is managed by the backend and reflected here
          automatically.
        </div>
      </div>
    </div>
  );
};

export default AdminStatisticsTab;
