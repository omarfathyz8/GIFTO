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
        {requests.length === 0 ? (
          <p className="loading-state">No requests yet.</p>
        ) : (
          (() => {
            const statusOrder = {
              pending: 1,
              reviewed: 2,
              processing: 3,
              fulfilled: 4,
              rejected: 5,
            };
            const sortedRequests = [...requests].sort(
              (a, b) =>
                (statusOrder[a.status || "pending"] || 6) -
                (statusOrder[b.status || "pending"] || 6),
            );
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
                    <p className="order-meta">
                      From: {request.email}
                    </p>
                    {request.description && (
                      <p className="order-meta">
                        Notes: {request.description}
                      </p>
                    )}
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
          })()
        )}
      </div>
    </section>
  );
};

export default ManageRequests;
