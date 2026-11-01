import Foundation

nonisolated final class APIClient {
    static let shared = APIClient()

    private let baseURL: String
    private let session: URLSession
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    private init() {
        let url = Config.EXPO_PUBLIC_RORK_API_BASE_URL
        self.baseURL = url.isEmpty ? "http://localhost:3000" : url
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)
    }

    private func trpcURL(_ path: String, input: String? = nil) -> URL? {
        var components = URLComponents(string: "\(baseURL)/api/trpc/\(path)")
        if let input {
            components?.queryItems = [URLQueryItem(name: "input", value: input)]
        }
        return components?.url
    }

    private func trpcPostURL(_ path: String) -> URL? {
        URL(string: "\(baseURL)/api/trpc/\(path)")
    }

    func trpcQuery<T: Decodable>(_ path: String, input: Encodable? = nil) async throws -> T {
        let inputJSON: String? = input.map {
            guard let data = try? JSONEncoder().encode(AnyEncodable($0)) else { return nil }
            return String(data: data, encoding: .utf8)
        }
        guard let url = trpcURL(path, input: inputJSON) else {
            throw APIError.invalidURL
        }
        let (data, response) = try await session.data(from: url)
        try checkResponse(response, data: data)
        let wrapper = try decoder.decode(TRPCResponse<T>.self, from: data)
        return wrapper.result.data.json
    }

    func trpcMutation<T: Decodable, I: Encodable>(_ path: String, input: I) async throws -> T {
        guard let url = trpcPostURL(path) else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body = TRPCMutationBody(json: AnyEncodable(input))
        request.httpBody = try encoder.encode(body)
        let (data, response) = try await session.data(for: request)
        try checkResponse(response, data: data)
        let wrapper = try decoder.decode(TRPCResponse<T>.self, from: data)
        return wrapper.result.data.json
    }

    private func checkResponse(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200...299).contains(http.statusCode) else {
            if let errorWrapper = try? decoder.decode(TRPCErrorResponse.self, from: data) {
                throw APIError.serverError(errorWrapper.error.message)
            }
            throw APIError.httpError(http.statusCode)
        }
    }
}

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .invalidResponse: return "Invalid response from server"
        case .httpError(let code): return "HTTP error: \(code)"
        case .serverError(let msg): return msg
        }
    }
}

private struct TRPCResponse<T: Decodable>: Decodable {
    let result: TRPCResult<T>
    struct TRPCResult: Decodable {
        let data: TRPCData<T>
    }
    struct TRPCData: Decodable {
        let json: T
    }
}

private struct TRPCErrorResponse: Decodable {
    let error: TRPCError
    struct TRPCError: Decodable {
        let message: String
    }
}

private struct TRPCMutationBody<I: Encodable>: Encodable {
    let json: I
}

private struct AnyEncodable: Encodable {
    private let encodeFunc: (Encoder) throws -> Void
    init(_ wrapped: Encodable) {
        self.encodeFunc = wrapped.encode
    }
    func encode(to encoder: Encoder) throws {
        try encodeFunc(encoder)
    }
}
