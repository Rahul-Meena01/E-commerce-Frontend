export default function CheckoutProgress({ activeStep, steps }) {
  return (
    <div className="checkout-progress-inner">
      {steps.map((step, index) => (
        <div key={step.number} className="checkout-progress-item">
          <div
            className={`checkout-step-circle ${
              step.number <= activeStep ? "active" : ""
            }`}
          >
            {step.number}
          </div>
          <span className="checkout-step-label">{step.label}</span>

          {index < steps.length - 1 && (
            <div
              className={`checkout-step-line ${
                step.number < activeStep ? "active" : ""
              }`}
            ></div>
          )}
        </div>
      ))}
    </div>
  );
}
