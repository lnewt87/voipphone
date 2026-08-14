using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Twilio.Jwt.AccessToken;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

app.UseCors();

app.MapGet("/", () => Results.Ok(new
{
    name = "CallDesk API",
    status = "online",
    endpoints = new[]
    {
        "/api/health",
        "/api/token",
        "/api/voice/outgoing",
        "/api/voice/incoming"
    }
}));

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ok",
    timestampUtc = DateTime.UtcNow
}));

app.MapGet("/api/token", (string? identity) =>
{
    var accountSid = Required("TWILIO_ACCOUNT_SID");
    var apiKey = Required("TWILIO_API_KEY");
    var apiSecret = Required("TWILIO_API_SECRET");
    var twimlAppSid = Required("TWILIO_TWIML_APP_SID");

    var safeIdentity = NormalizeIdentity(
        identity ??
        Environment.GetEnvironmentVariable("TWILIO_CLIENT_IDENTITY") ??
        "mobile_user");

    var voiceGrant = new VoiceGrant
    {
        OutgoingApplicationSid = twimlAppSid,
        IncomingAllow = true
    };

    var pushCredentialSid =
        Environment.GetEnvironmentVariable("TWILIO_PUSH_CREDENTIAL_SID");

    if (!string.IsNullOrWhiteSpace(pushCredentialSid))
    {
        voiceGrant.PushCredentialSid = pushCredentialSid;
    }

    var grants = new HashSet<IGrant>
    {
        voiceGrant
    };

    var token = new Token(
        accountSid,
        apiKey,
        apiSecret,
        safeIdentity,
        DateTime.UtcNow.AddHours(1),
        grants: grants);

    return Results.Ok(new
    {
        identity = safeIdentity,
        token = token.ToJwt(),
        expiresInSeconds = 3600
    });
});

app.MapPost("/api/voice/outgoing", async (HttpRequest request) =>
{
    var form = await request.ReadFormAsync();
    var to = form["To"].ToString();
    var callerId = Required("TWILIO_CALLER_ID");

    if (!IsE164(to))
    {
        var invalidResponse = new XDocument(
            new XElement("Response",
                new XElement("Say", "The destination phone number is invalid.")));

        return Results.Text(
            invalidResponse.ToString(SaveOptions.DisableFormatting),
            "text/xml");
    }

    var response = new XDocument(
        new XElement("Response",
            new XElement("Dial",
                new XAttribute("callerId", callerId),
                new XElement("Number", to))));

    return Results.Text(
        response.ToString(SaveOptions.DisableFormatting),
        "text/xml");
});

app.MapPost("/api/voice/incoming", () =>
{
    var identity =
        NormalizeIdentity(
            Environment.GetEnvironmentVariable("TWILIO_CLIENT_IDENTITY") ??
            "mobile_user");

    var response = new XDocument(
        new XElement("Response",
            new XElement("Dial",
                new XElement("Client", identity))));

    return Results.Text(
        response.ToString(SaveOptions.DisableFormatting),
        "text/xml");
});

app.Run();

static string Required(string key)
{
    var value = Environment.GetEnvironmentVariable(key);

    if (string.IsNullOrWhiteSpace(value))
    {
        throw new InvalidOperationException(
            $"Missing required environment variable: {key}");
    }

    return value;
}

static string NormalizeIdentity(string identity)
{
    var normalized = Regex.Replace(identity, @"[^A-Za-z0-9_]", "_");

    if (string.IsNullOrWhiteSpace(normalized))
    {
        return "mobile_user";
    }

    return normalized.Length <= 121
        ? normalized
        : normalized[..121];
}

static bool IsE164(string value)
{
    return Regex.IsMatch(value, @"^\+[1-9]\d{7,14}$");
}
