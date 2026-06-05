import React from "react";

const ManageRequests = ({ requests, updateRequestStatus }) => {
  return (
    <section className="admin-section">
      <div className="section-title-row centered">
        <div>
          <h2>Manage Requests</h2>
        </div>
      </div>

      <div className="admin-card">
        {(() => {
          const activeRequests = requests.filter(
            (request) => request.status !== "fulfilled" && request.status !== "rejected"
          );

          if (activeRequests.length === 0) {
            return <p className="loading-state">No active requests.</p>;
          }

          const statusOrder = {
            pending: 1,
            reviewed: 2,
            processing: 3,
            fulfilled: 4,
            rejected: 5,
          };
          const sortedRequests = [...activeRequests].sort((a, b) => {
            const statusDiff =
              (statusOrder[a.status || "pending"] || 6) -
              (statusOrder[b.status || "pending"] || 6);
            if (statusDiff !== 0) return statusDiff;
            return (a.createdAt || 0) - (b.createdAt || 0);
          });

          return sortedRequests.map((request) => (
            <article key={request.dbKey} className="order-manager-card">
              <div className="order-manager-top">
                <div>
                  <p className="order-label">
                    {request.itemName}
                  </p>
                  {request.category && (
                    <p className="order-meta">
                      Category: {request.category}
                    </p>
                  )}
                  {request.description && (
                    <p className="order-meta">
                      Notes: {request.description}
                    </p>
                  )}
                  {(request.budgetMin !== null && request.budgetMin !== undefined && request.budgetMin !== "") || (request.budgetMax !== null && request.budgetMax !== undefined && request.budgetMax !== "") ? (
                    <p className="order-meta">
                      Budget: {request.budgetMin || "—"} - {request.budgetMax || "—"} LE
                    </p>
                  ) : null}
                  <p className="order-meta">
                    From: <a href={`mailto:${request.email}`} style={{ color: "#8b4513", textDecoration: "underline", cursor: "pointer" }}>{request.email}</a>
                  </p>
                  <p className="order-meta">
                    Requested on {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`order-status status-${request.status || "pending"}`}
                >
                  {request.status || "pending"}
                </span>
              </div>
              {request.status !== "rejected" && request.status !== "fulfilled" && (
                <div className="status-actions">
                  {["pending", "reviewed", "processing", "fulfilled", "rejected"].map(
                    (status) => (
                      <button
                        type="button"
                        key={`${request.dbKey}-${status}`}
                        className={`status-button ${request.status === status ? "active" : ""}`}
                        onClick={() =>
                          updateRequestStatus(request.dbKey, status)
                        }
                      >
                        {status}
                      </button>
                    ),
                  )}
                </div>
              )}
            </article>
          ));
        })()}
      </div>
    </section>
  );
};

export default ManageRequests;
