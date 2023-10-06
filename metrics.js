// Import dependencies with more descriptive names
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

// Define a configuration object to organize configuration values
const config = {
  port: 9464,
  meterName: "hub-uploads",
  histogramConfig: {
    name: "hub_uploads_file_upload_time",
    description: "Time for file upload",
    unit: "ms",
    boundaries: [100, 200, 400, 800, 1600],
    labelKeys: ["status"],
  },
};

// Export a Metrics object to encapsulate initialization and the exporter
const Metrics = {
  exporter: new PrometheusExporter({ port: config.port }),

  initialize() {
    const meterProvider = new MeterProvider();
    meterProvider.addMetricReader(this.exporter);
    const meter = meterProvider.getMeter(config.meterName);

    const FileUploadTime = meter.createHistogram(config.histogramConfig.name, {
      description: config.histogramConfig.description,
      unit: config.histogramConfig.unit,
      boundaries: config.histogramConfig.boundaries,
    });

    return { meter, FileUploadTime };
  },
};

export default Metrics;
