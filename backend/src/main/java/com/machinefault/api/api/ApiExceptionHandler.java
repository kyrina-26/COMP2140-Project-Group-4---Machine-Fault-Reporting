package com.machinefault.api.api;
import org.springframework.http.*; import org.springframework.web.bind.MethodArgumentNotValidException; import org.springframework.web.bind.annotation.*; import org.springframework.web.multipart.MaxUploadSizeExceededException; import java.util.*;
// Converts common Java exceptions into consistent HTTP error responses for the frontend.
@RestControllerAdvice public class ApiExceptionHandler {
 @ExceptionHandler(NoSuchElementException.class) ResponseEntity<?> notFound(NoSuchElementException e){return ResponseEntity.status(404).body(Map.of("error",e.getMessage()));}
 @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<?> badRequest(IllegalArgumentException e){return ResponseEntity.badRequest().body(Map.of("error",e.getMessage()));}
 @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<?> invalid(MethodArgumentNotValidException e){var errors=new LinkedHashMap<String,String>();e.getBindingResult().getFieldErrors().forEach(x->errors.putIfAbsent(x.getField(),x.getDefaultMessage()));return ResponseEntity.badRequest().body(Map.of("error","Validation failed","fields",errors));}
 @ExceptionHandler(MaxUploadSizeExceededException.class) ResponseEntity<?> tooLarge(){return ResponseEntity.status(413).body(Map.of("error","Upload exceeds the configured maximum size."));}
}
