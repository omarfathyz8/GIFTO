const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY;
const BREVO_SENDER_EMAIL = import.meta.env.VITE_BREVO_SENDER_EMAIL;
const BREVO_SENDER_NAME = import.meta.env.VITE_BREVO_SENDER_NAME;
const GOOGLE_FORM_ID = import.meta.env.VITE_GOOGLE_FORM_ID;
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

export const submitToGoogleForms = async (orderData, customerEmail) => {
  if (!GOOGLE_FORM_ID) {
    console.warn("Google Form ID not configured");
    return false;
  }

  try {
    const formData = new FormData();

    formData.append("entry.364193299", String(orderData.id));
    formData.append("entry.37797355", String(orderData.name));
    formData.append("entry.677306714", String(customerEmail));
    formData.append("entry.1848199176", String(orderData.phone));
    formData.append("entry.1312113593", String(orderData.address));
    formData.append("entry.251803140", orderData.items.map((i) => `${i.name} (x${i.quantity})`).join(", "));
    formData.append("entry.1384354734", String(orderData.total));
    formData.append("entry.1824052770", String(orderData.paymentMethod));
    formData.append("entry.1691925111", orderData.giftWrap ? "Yes" : "No");
    formData.append("entry.1907235798", String(orderData.cardMessage || "None"));
    formData.append("entry.2120889714", String(orderData.status || "pending"));

    const formUrl = `https://docs.google.com/forms/u/0/d/${GOOGLE_FORM_ID}/formResponse`;

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.name = "hidden_iframe";
    document.body.appendChild(iframe);

    const form = document.createElement("form");
    form.action = formUrl;
    form.method = "POST";
    form.target = "hidden_iframe";
    form.style.display = "none";

    formData.forEach((value, key) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 1000);

    console.log("Google Forms submission sent");
    return true;
  } catch (error) {
    console.error("Error submitting to Google Forms:", error);
    return false;
  }
};

export const sendOrderEmail = async (orderData, customerEmail) => {
  if (!BREVO_API_KEY) {
    console.warn("Brevo API key not configured");
    return false;
  }

  try {
    const itemsList = orderData.items
      .map((item) => `<li>${item.name} (x${item.quantity}) - ${item.price * item.quantity} LE</li>`)
      .join("");

    const htmlContent = `
      <h2>Order Confirmation 🎉 - #${orderData.id}</h2>
      <p>Hello ${orderData.name},</p>
      <p>Thank you for your order! Here are your order details:</p>

      <h3>Order Items</h3>
      <ul>
        ${itemsList}
      </ul>

      <h3>Order Summary</h3>
      <p><strong>Subtotal:</strong> ${orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0)} LE</p>
      ${orderData.giftWrap ? `<p><strong>Gift Wrapping:</strong> 50 LE</p>` : ""}
      ${orderData.cardMessage ? `<p><strong>Gift Message:</strong> 10 LE (${orderData.cardMessage})</p>` : ""}
      <p><strong>Total:</strong> ${orderData.total} LE</p>

      <p><strong>Payment Method:</strong> ${orderData.paymentMethod.toUpperCase()}</p>
      <p><strong>Status:</strong> ${orderData.status}</p>

      <p>You can track your order status anytime at: <a href="https://giftoo-storee.vercel.app" style="color: #0066cc;">https://giftoo-storee.vercel.app</a></p>
      <p>We'll notify you when your order is shipped!</p>
      <p>Best regards,<br>GIFTO Team</p>
    `;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: customerEmail,
            name: orderData.name,
          },
        ],
        subject: `Order Confirmation - #${orderData.id}`,
        htmlContent,
      }),
    });

    if (!response.ok) {
      console.error("Brevo API error:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending order email:", error);
    return false;
  }
};

export const sendAdminNotification = async (orderData, customerEmail) => {
  if (!BREVO_API_KEY) {
    console.warn("Brevo API key not configured");
    return false;
  }

  try {
    const itemsList = orderData.items
      .map((item) => `<li>${item.name} (x${item.quantity})</li>`)
      .join("");

    const htmlContent = `
      <h2>New Order Received! 🎉</h2>
      <p><strong>Order ID:</strong> #${orderData.id}</p>

      <h3>Customer Details</h3>
      <p><strong>Name:</strong> ${orderData.name}</p>
      <p><strong>Email:</strong> <a href="mailto:${customerEmail}">${customerEmail}</a></p>
      <p><strong>Phone:</strong> <a href="tel:${orderData.phone}">${orderData.phone}</a></p>
      <p><strong>Address:</strong> ${orderData.address}</p>

      <h3>Items Ordered</h3>
      <ul>
        ${itemsList}
      </ul>

      <p><strong>Total:</strong> ${orderData.total} LE</p>
      <p><strong>Payment Method:</strong> ${orderData.paymentMethod.toUpperCase()}</p>
      <p><strong>Gift Wrap:</strong> ${orderData.giftWrap ? "Yes" : "No"}</p>
      ${orderData.cardMessage ? `<p><strong>Message:</strong> ${orderData.cardMessage}</p>` : ""}
    `;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: BREVO_SENDER_EMAIL,
          },
        ],
        subject: `New Order - #${orderData.id}`,
        htmlContent,
      }),
    });

    if (!response.ok) {
      console.error("Admin notification error:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending admin notification:", error);
    return false;
  }
};

export const sendCancellationEmail = async (orderData, customerEmail) => {
  if (!BREVO_API_KEY) {
    console.warn("Brevo API key not configured");
    return false;
  }

  try {
    const itemsList = orderData.items
      .map((item) => `<li>${item.name} (x${item.quantity}) - ${item.price * item.quantity} LE</li>`)
      .join("");

    const htmlContent = `
      <h2>Order Cancelled 🚫 - #${orderData.id}</h2>
      <p>Hello ${orderData.name},</p>
      <p>Your order has been successfully cancelled. Here are the details:</p>

      <h3>Cancelled Items</h3>
      <ul>
        ${itemsList}
      </ul>

      <h3>Refund Summary</h3>
      <p><strong>Subtotal:</strong> ${orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0)} LE</p>
      ${orderData.giftWrap ? `<p><strong>Gift Wrapping:</strong> 50 LE (refunded)</p>` : ""}
      ${orderData.cardMessage ? `<p><strong>Gift Message:</strong> 10 LE (refunded)</p>` : ""}
      <p><strong>Total Refund:</strong> ${orderData.total} LE</p>

      <p>If you paid in advance, the refund will be processed within 5-7 business days.</p>
      <p>If you have any questions, please contact us at <a href="mailto:giftoo.storee@gmail.com">giftoo.storee@gmail.com</a></p>
      <p>Thank you for understanding.<br>Best regards,<br>GIFTO Team</p>
    `;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: customerEmail,
            name: orderData.name,
          },
        ],
        subject: `Order Cancelled - #${orderData.id}`,
        htmlContent,
      }),
    });

    if (!response.ok) {
      console.error("Brevo API error:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending cancellation email:", error);
    return false;
  }
};

export const sendCancellationAdminNotification = async (orderData, customerEmail) => {
  if (!BREVO_API_KEY) {
    console.warn("Brevo API key not configured");
    return false;
  }

  try {
    const itemsList = orderData.items
      .map((item) => `<li>${item.name} (x${item.quantity})</li>`)
      .join("");

    const htmlContent = `
      <h2>Order Cancelled 🚫</h2>
      <p><strong>Order ID:</strong> #${orderData.id}</p>

      <h3>Customer Details</h3>
      <p><strong>Name:</strong> ${orderData.name}</p>
      <p><strong>Email:</strong> <a href="mailto:${customerEmail}">${customerEmail}</a></p>
      <p><strong>Phone:</strong> <a href="tel:${orderData.phone}">${orderData.phone}</a></p>

      <h3>Cancelled Items</h3>
      <ul>
        ${itemsList}
      </ul>

      <p><strong>Total Refunded:</strong> ${orderData.total} LE</p>
      <p><strong>Payment Method:</strong> ${orderData.paymentMethod.toUpperCase()}</p>
      <p>Inventory has been restored for all items in this order.</p>
    `;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: BREVO_SENDER_EMAIL,
          },
        ],
        subject: `Order Cancelled - #${orderData.id}`,
        htmlContent,
      }),
    });

    if (!response.ok) {
      console.error("Admin cancellation notification error:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending admin cancellation notification:", error);
    return false;
  }
};

export const markOrderAsCancelledInSheet = async (orderId) => {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("YOUR_DEPLOYMENT")) {
    console.warn("Google Apps Script URL not configured - skipping sheet update");
    return true;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      signal: controller.signal,
      body: JSON.stringify({
        orderId: String(orderId),
        action: "mark",
      }),
    });

    clearTimeout(timeoutId);
    console.log(`Order ${orderId} marked as cancelled in Google Sheet`);
    return true;
  } catch (error) {
    console.warn("Sheet update failed (non-blocking):", error);
    return true;
  }
};

export const sendRequestConfirmationEmail = async (requestData) => {
  if (!BREVO_API_KEY) {
    console.warn("Brevo API key not configured");
    return false;
  }

  try {
    const htmlContent = `
      <h2>Request Received! ✨</h2>
      <p>Thank you for submitting a specific item request!</p>

      <h3>Your Request Details</h3>
      <p><strong>Item Name:</strong> ${requestData.itemName}</p>
      ${requestData.category ? `<p><strong>Category:</strong> ${requestData.category}</p>` : ""}
      ${requestData.description ? `<p><strong>Description:</strong> ${requestData.description}</p>` : ""}

      <h3>What's Next?</h3>
      <p>Our team will review your request and get back to you.</p>
      
      <p>You can track the status of your request anytime using your email address at: <a href="https://giftoo-storee.vercel.app" style="color: #5e2f07;">Track Your Request</a></p>

      <p>If you have any questions, feel free to reach out to us at <a href="mailto:giftoo.storee@gmail.com">giftoo.storee@gmail.com</a></p>

      <p>Thank you for choosing GIFTO!<br>Best regards,<br>GIFTO Team</p>
    `;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: requestData.email,
          },
        ],
        subject: "Request Received - GIFTO",
        htmlContent,
      }),
    });

    if (!response.ok) {
      console.error("Brevo API error:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending request confirmation email:", error);
    return false;
  }
};

export const sendRequestAdminNotification = async (requestData) => {
  if (!BREVO_API_KEY) {
    console.warn("Brevo API key not configured");
    return false;
  }

  try {
    const htmlContent = `
      <h2>New Request Received! 📋</h2>

      <h3>Request Details</h3>
      <p><strong>Item Name:</strong> ${requestData.itemName}</p>
      <p><strong>Category:</strong> ${requestData.category || "Not specified"}</p>
      <p><strong>Customer Email:</strong> <a href="mailto:${requestData.email}">${requestData.email}</a></p>
      ${requestData.description ? `<p><strong>Description:</strong> ${requestData.description}</p>` : ""}
      <p><strong>Current Status:</strong> ${requestData.status || "pending"}</p>
      <p>You can update the status of this request in the admin dashboard.</p>
    `;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: BREVO_SENDER_EMAIL,
          },
        ],
        subject: `New Request - ${requestData.itemName}`,
        htmlContent,
      }),
    });

    if (!response.ok) {
      console.error("Admin notification error:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending admin notification:", error);
    return false;
  }
};
