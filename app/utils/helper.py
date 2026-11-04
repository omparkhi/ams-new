import logging

logger = logging.getLogger(__name__)

try:
    from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type, RetryError
    from googleapiclient.errors import HttpError

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type(HttpError),
        before_sleep=lambda retry_state: logger.info(f"Retrying API call (attempt {retry_state.attempt_number}) due to error: {retry_state.outcome.exception()}"))
    def safe_api_call(api_call):
        if api_call is None:
            return {}
        import time
        time.sleep(1)
        return api_call.execute()

except Exception:
    def safe_api_call(api_call):
        if api_call is None:
            return {}
        try:
            import time
            time.sleep(1)
            return api_call.execute()
        except Exception as e:
            logger.warning(f"safe_api_call error: {e}")
            return {}
